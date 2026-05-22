import { after, NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";
import { verifyTwilioSignature } from "@/lib/twilio/verify";
import { sendWhatsApp } from "@/lib/twilio/client";
import { extractCode, resolveSender, tryLinkByCode } from "@/lib/ingest/onboarding";
import { enqueueJob } from "@/lib/jobs/queue";
import { processInbound } from "@/lib/ingest/process";
import { rateLimit } from "@/lib/ratelimit/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function twiml() {
  return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params: Record<string, string> = {};
  new URLSearchParams(rawBody).forEach((v, k) => {
    params[k] = v;
  });

  // 1) Verificar firma Twilio (sobre el body crudo)
  const url = `${process.env.APP_BASE_URL ?? ""}/api/twilio/inbound`;
  const signature = req.headers.get("x-twilio-signature");
  if (!verifyTwilioSignature({ authToken: process.env.TWILIO_AUTH_TOKEN ?? "", url, params, signature })) {
    return new NextResponse("invalid signature", { status: 403 });
  }

  const sid = params.MessageSid || params.SmsMessageSid;
  if (!sid) return twiml();
  const fromRaw = params.From ?? "";
  const phone = fromRaw.replace(/^whatsapp:/, "");
  const body = (params.Body ?? "").trim();
  const admin = createAdminClient();

  // 2) Idempotencia
  const { data: existing } = await admin.from("inbound_messages").select("id").eq("twilio_sid", sid).maybeSingle();
  if (existing) return twiml();

  // 3) Resolver remitente
  const sender = await resolveSender(phone);

  // 4) Onboarding (remitente desconocido) — antes de gastar nada
  if (!sender) {
    const code = extractCode(body);
    if (code) {
      const res = await tryLinkByCode({ phoneE164: phone, code });
      if (res.ok) {
        const { data: prof } = await admin.from("profiles").select("full_name").eq("id", res.userId).maybeSingle();
        const { data: studio } = await admin.from("studios").select("name").eq("id", res.studioId).maybeSingle();
        const nm = prof?.full_name?.split(" ")[0] ?? "";
        await sendWhatsApp(
          fromRaw,
          `¡Listo${nm ? `, ${nm}` : ""}! Tu WhatsApp quedó vinculado al estudio ${studio?.name ?? ""}. Reenviame fotos, audios o cotizaciones y los ordeno solos. ¿En qué obra estás trabajando hoy?`,
        );
      } else {
        await sendWhatsApp(fromRaw, "Ese código no me figura o ya venció (duran 15 minutos). Generá uno nuevo desde la app y mandámelo de nuevo.");
      }
    } else {
      await sendWhatsApp(fromRaw, "Hola 👋 Soy el asistente de Escuadra y funciono con cuentas vinculadas. Si tenés cuenta, mandame tu código (ARQ-XXXXXXXX).");
    }
    return twiml();
  }

  // Rate limit por remitente (best-effort): evita flood/costo
  if (!(await rateLimit(`wa:${phone}`, 40, 60))) return twiml();

  // 5) Guardar inbound + encolar; procesar en background tras el 200
  const { data: inbound } = await admin
    .from("inbound_messages")
    .insert({
      twilio_sid: sid,
      from_phone: phone,
      studio_id: sender.studioId,
      user_id: sender.userId,
      num_media: parseInt(params.NumMedia ?? "0", 10) || 0,
      body: body || null,
      raw: params,
    })
    .select("id")
    .single();

  if (inbound) {
    const job = await enqueueJob(inbound.id, sender.studioId);
    if (job) {
      const jobId = job.id;
      const inboundId = inbound.id;
      after(async () => {
        try {
          await processInbound({ jobId, inboundId });
        } catch (e) {
          console.error("[twilio] after processInbound", e);
        }
      });
    }
  }

  return twiml();
}
