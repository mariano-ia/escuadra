import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/db/supabase";
import { downloadTwilioMedia, sendWhatsApp } from "@/lib/twilio/client";
import { uploadMedia } from "@/lib/storage";
import { transcribeAudio } from "@/lib/whisper/transcribe";
import { classifyMessage, type Classification, type Filing } from "@/lib/claude/classify";
import { finishJob, finishJobs, pendingInboundsForSender, claimJobs } from "@/lib/jobs/queue";
import { resolveRouting, parseObraCommand } from "@/lib/ingest/route";
import { combineBodies } from "@/lib/ingest/grouping";
import { driveConfigured, syncPendingPhotos } from "@/lib/cloud/gdrive";
import type { Json } from "@/lib/db/types";

type RawParams = Record<string, string>;
type Stored = { path: string; contentType: string; isImage: boolean; isAudio: boolean };

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/amr": "amr",
  "application/pdf": "pdf", "video/mp4": "mp4",
};
const ext = (ct: string) => EXT[ct] ?? "bin";
const isImage = (ct: string) => ct.startsWith("image/");
const isAudio = (ct: string) => ct.startsWith("audio/");

async function logEvent(studioId: string, userId: string, event: string, props: Json = {}) {
  try {
    await createAdminClient().from("event_log").insert({ studio_id: studioId, user_id: userId, event, props });
  } catch {
    /* no-op */
  }
}

async function getActiveObra(studioId: string, userId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("conversation_state")
    .select("active_obra_id, active_obra_set_at")
    .eq("studio_id", studioId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.active_obra_id || !data.active_obra_set_at) return null;
  // TTL 8h
  if (Date.now() - new Date(data.active_obra_set_at).getTime() > 8 * 3600 * 1000) return null;
  return data.active_obra_id;
}

async function setActiveObra(studioId: string, userId: string, obraId: string) {
  await createAdminClient().from("conversation_state").upsert(
    { studio_id: studioId, user_id: userId, active_obra_id: obraId, active_obra_set_at: new Date().toISOString(), last_message_at: new Date().toISOString() },
    { onConflict: "studio_id,user_id" },
  );
}

async function findOrCreateAlbum(studioId: string, obraId: string, hint: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("albums").select("id").eq("obra_id", obraId).ilike("name", hint).maybeSingle();
  if (existing) return existing.id;
  const { data } = await admin.from("albums").insert({ studio_id: studioId, obra_id: obraId, name: hint, kind: "custom" }).select("id").maybeSingle();
  return data?.id ?? null;
}

async function findOrCreateProvider(studioId: string, name: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("providers").select("id").eq("studio_id", studioId).ilike("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data } = await admin.from("providers").insert({ studio_id: studioId, name, is_provisional: true }).select("id").maybeSingle();
  return data?.id ?? null;
}

async function buildStudioContext(studioId: string, userId: string): Promise<string> {
  const admin = createAdminClient();
  const [{ data: obras }, { data: providers }, active] = await Promise.all([
    admin.from("obras").select("id,name,address,client_name").eq("studio_id", studioId).eq("is_inbox", false).limit(40),
    admin.from("providers").select("name,trade").eq("studio_id", studioId).limit(40),
    getActiveObra(studioId, userId),
  ]);
  const obrasStr = (obras ?? []).map((o) => `- ${o.name}${o.address ? ` (${o.address})` : ""}${o.client_name ? ` — cliente ${o.client_name}` : ""} [id:${o.id}]`).join("\n") || "(sin obras todavía)";
  const provStr = (providers ?? []).map((p) => `- ${p.name}${p.trade ? ` (${p.trade})` : ""}`).join("\n") || "(sin proveedores)";
  const activeName = active ? (obras ?? []).find((o) => o.id === active)?.name : null;
  return `Obras activas:\n${obrasStr}\n\nProveedores conocidos:\n${provStr}\n\nObra activa de la sesión: ${activeName ? `${activeName} [id:${active}]` : "(ninguna)"}`;
}

async function fileEntry(opts: {
  studioId: string; obraId: string; userId: string; inboundId: string;
  filing?: Filing; body: string; transcript: string | null; stored: Stored[];
  confidence: number; needsReview: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  const type = opts.filing?.content_type ?? (opts.stored.some((s) => s.isImage) ? "photo" : opts.stored.some((s) => s.isAudio) ? "audio" : "note");

  let albumId: string | null = null;
  if (type === "photo" && opts.filing?.album_hint) albumId = await findOrCreateAlbum(opts.studioId, opts.obraId, opts.filing.album_hint);

  const { data: entry, error: entryErr } = await admin.from("timeline_entries").insert({
    studio_id: opts.studioId, obra_id: opts.obraId, type, created_by_user_id: opts.userId,
    body_text: [opts.body, opts.transcript].filter(Boolean).join("\n") || null,
    source: "whatsapp", inbound_message_id: opts.inboundId, confidence: opts.confidence, needs_review: opts.needsReview,
  }).select("id").single();
  // No tragar el error: un fallo acá significaría archivar "en silencio" (chat confirma, nada se guarda).
  // Lanzamos para que el job quede visible/reintentable en vez de perder el mensaje.
  if (entryErr || !entry) {
    console.error("[ingest] fileEntry: insert de timeline_entries falló", { obraId: opts.obraId, type, err: entryErr?.message });
    throw entryErr ?? new Error("timeline_entries insert devolvió null");
  }

  for (const s of opts.stored) {
    if (s.isImage) {
      await admin.from("photos").insert({ studio_id: opts.studioId, obra_id: opts.obraId, album_id: albumId, timeline_entry_id: entry.id, storage_path: s.path, created_by_user_id: opts.userId });
    } else {
      await admin.from("media_assets").insert({
        studio_id: opts.studioId, timeline_entry_id: entry.id,
        kind: s.isAudio ? "audio" : s.contentType === "application/pdf" ? "document" : s.contentType.startsWith("video/") ? "video" : "image",
        storage_path: s.path, mime: s.contentType,
        transcript: s.isAudio ? opts.transcript : null, transcript_lang: s.isAudio && opts.transcript ? "es" : null,
      });
    }
  }

  const f = opts.filing?.fields ?? {};
  if (type === "quote") {
    let providerId: string | null = null;
    if (f.provider_name) providerId = await findOrCreateProvider(opts.studioId, f.provider_name);
    await admin.from("quotes").insert({ studio_id: opts.studioId, obra_id: opts.obraId, provider_id: providerId, timeline_entry_id: entry.id, amount: f.amount ?? null, currency: f.currency ?? "ARS", description: opts.body || null, valid_until: f.valid_until ?? null, needs_review: opts.needsReview });
  } else if (type === "payment") {
    await admin.from("payments").insert({ studio_id: opts.studioId, obra_id: opts.obraId, timeline_entry_id: entry.id, amount: f.amount ?? null, currency: f.currency ?? "ARS" });
  } else if (type === "approval") {
    await admin.from("approvals").insert({ studio_id: opts.studioId, obra_id: opts.obraId, timeline_entry_id: entry.id, subject: opts.body || null, status: "approved" });
  } else if (type === "issue") {
    const sev = f.severity === "alta" || f.severity === "baja" ? f.severity : "media";
    await admin.from("issues").insert({ studio_id: opts.studioId, obra_id: opts.obraId, timeline_entry_id: entry.id, title: f.issue_title ?? "Problema", description: opts.body || null, severity: sev });
  }
}

function firstName(full: string | null): string {
  return full?.trim().split(/\s+/)[0] ?? "";
}

/** Conteo escueto para los acuses: "5 fotos", "1 audio", "3 fotos y 1 audio".
 *  El acuse dice CUÁNTAS cosas y DÓNDE — nunca describe el contenido. */
function countPhrase(stored: Stored[]): string {
  const photos = stored.filter((s) => s.isImage).length;
  const audios = stored.filter((s) => s.isAudio).length;
  const others = stored.length - photos - audios;
  const parts: string[] = [];
  if (photos) parts.push(`${photos} ${photos === 1 ? "foto" : "fotos"}`);
  if (audios) parts.push(`${audios} ${audios === 1 ? "audio" : "audios"}`);
  if (others) parts.push(`${others} ${others === 1 ? "archivo" : "archivos"}`);
  return parts.join(" y ") || "lo que mandaste";
}

/** Procesa un mensaje entrante. UNA sola responsabilidad: identificar la obra y archivar.
 *  CERO charla extra: nada de "andá al panel", nada de "responde 1/2/3", nada de "moví lo
 *  último a X". Si no se puede identificar la obra → Inbox. Si no hay contenido para archivar
 *  (pregunta, instrucción, ruido) → no responde, no guarda basura. La confirmación SOLO se
 *  manda DESPUÉS de que la entry está realmente en la base — si fileEntry tira, el job se
 *  reintenta y nunca se manda un "✓ guardé" mentiroso. */
export async function processInbound(opts: { jobId: string; inboundId: string; groupWindow?: boolean }): Promise<void> {
  const admin = createAdminClient();
  const { data: inbound } = await admin.from("inbound_messages").select("*").eq("id", opts.inboundId).single();
  if (!inbound?.studio_id || !inbound.user_id) {
    await finishJob(opts.jobId, "done");
    return;
  }
  const studioId = inbound.studio_id;
  const userId = inbound.user_id;
  const raw = (inbound.raw ?? {}) as RawParams;
  const from = inbound.from_phone ?? "";
  let body = (inbound.body ?? "").trim();
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const name = firstName(profile?.full_name ?? null);

  const noMedia = parseInt(raw.NumMedia ?? "0", 10) === 0;

  // --- Único atajo de "no-contenido": fijar obra activa explícitamente ("obra X" o el nombre
  //     exacto a secas). Setea estado, NO archiva, la confirmación describe un estado real
  //     (no es un "✓ guardé" mentiroso). Las correcciones, preguntas y reordenes son en la web.
  if (noMedia && body) {
    const cmdQuery = parseObraCommand(body);
    const q = (cmdQuery ?? body).trim().toLowerCase();
    const { data: obras } = await admin.from("obras").select("id,name").eq("studio_id", studioId).eq("is_inbox", false);
    const match =
      (obras ?? []).find((o) => o.name.toLowerCase() === q) ??
      (cmdQuery ? (obras ?? []).find((o) => o.name.toLowerCase().includes(q)) : undefined);
    if (match) {
      await setActiveObra(studioId, userId, match.id);
      await sendWhatsApp(from, `Listo${name ? `, ${name}` : ""} 👷 Ahora trabajás en ${match.name}. Mandame fotos, audios o cotizaciones y los guardo ahí.`);
      await logEvent(studioId, userId, "set_active_obra", { obra_id: match.id });
      await finishJob(opts.jobId, "done");
      return;
    }
  }

  // --- Agrupación de la ráfaga (ventana de avance) ---
  // Con groupWindow (el webhook ya esperó ~90s), juntamos los mensajes del MISMO remitente
  // que siguen en cola: WhatsApp manda cada foto suelta, pero las archivamos como UN avance.
  const numMedia = parseInt(raw.NumMedia ?? "0", 10) || 0;
  const burstJobIds: string[] = [opts.jobId];
  const burstInboundIds: string[] = [opts.inboundId];
  if (opts.groupWindow && numMedia > 0) {
    const pending = await pendingInboundsForSender(from, studioId);
    const myMs = new Date(inbound.received_at).getTime();
    // Si llegó algo MÁS NUEVO del remitente, que cierre ESE handler (no dupliquemos la ráfaga).
    if (pending.some((p) => p.inboundId !== opts.inboundId && p.receivedAtMs > myMs)) return;
    const sibs = pending.filter((p) => p.inboundId !== opts.inboundId);
    const claimed = await claimJobs(sibs.map((s) => s.jobId));
    for (const s of sibs) {
      if (claimed.includes(s.jobId)) {
        burstJobIds.push(s.jobId);
        burstInboundIds.push(s.inboundId);
      }
    }
  }

  // --- Descargar media de TODO el avance (trigger + ráfaga), en orden cronológico ---
  const burstInbounds =
    burstInboundIds.length > 1
      ? ((await admin.from("inbound_messages").select("*").in("id", burstInboundIds)).data ?? [inbound]).sort(
          (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime(),
        )
      : [inbound];
  body = combineBodies(burstInbounds.map((b) => (b.body ?? "").trim()));

  const stored: Stored[] = [];
  const images: { mediaType: string; dataBase64: string }[] = [];
  let transcript: string | null = null;
  for (const ib of burstInbounds) {
    const r = (ib.raw ?? {}) as RawParams;
    const n = parseInt(r.NumMedia ?? "0", 10) || 0;
    for (let i = 0; i < n; i++) {
      const url = r[`MediaUrl${i}`];
      const ct = r[`MediaContentType${i}`] ?? "application/octet-stream";
      if (!url) continue;
      try {
        const { bytes, contentType } = await downloadTwilioMedia(url);
        const path = await uploadMedia({ studioId, subpath: `incoming/${randomUUID()}.${ext(contentType)}`, bytes, contentType });
        stored.push({ path, contentType, isImage: isImage(contentType), isAudio: isAudio(contentType) });
        if (isImage(contentType) && images.length < 4) images.push({ mediaType: contentType, dataBase64: bytes.toString("base64") });
        if (isAudio(contentType) && !transcript) transcript = await transcribeAudio(bytes, `audio.${ext(contentType)}`);
      } catch (e) {
        console.error("[ingest] media fail", e);
      }
    }
  }

  // --- Clasificar ---
  let cls: Classification;
  try {
    cls = await classifyMessage({ studioContext: await buildStudioContext(studioId, userId), text: body || null, transcript, images });
  } catch (e) {
    console.error("[ingest] classify fail", e);
    cls = {
      intent: "archivar",
      filings: [{ obra_id: null, obra_confidence: 0, content_type: stored.some((s) => s.isAudio) ? "audio" : stored.some((s) => s.isImage) ? "photo" : "note", album_hint: null, fields: {} }],
      needs_clarification: false, clarification_question: null, clarification_options: [], summary_es: "Lo guardé",
    };
  }

  // El chat SOLO captura contenido. Preguntas, instrucciones, ruido o correcciones por TEXTO
  // no se archivan ni se contestan: se resuelven en la web (no inventamos respuestas, no
  // movemos entries, no escribimos notas basura). Si hay media, SIEMPRE se archiva (no se
  // pierde un archivo enviado, sin importar lo que diga el caption).
  if (stored.length === 0 && cls.intent !== "archivar") {
    await finishJobs(burstJobIds, "done");
    return;
  }

  const { data: allObras } = await admin.from("obras").select("id,name,is_inbox").eq("studio_id", studioId);
  const realObras = (allObras ?? []).filter((o) => !o.is_inbox);
  const inboxObra = (allObras ?? []).find((o) => o.is_inbox);
  const activeObra = await getActiveObra(studioId, userId);
  const primary = cls.filings[0];
  // ¿El texto/transcripción nombra una obra existente? (ej. "obra de tincho" → Casa Tincho)
  const hay = `${body} ${transcript ?? ""}`.toLowerCase();
  const textMatchedObraId =
    realObras.find((o) => {
      const n = o.name.toLowerCase();
      return hay.includes(n) || n.split(/\s+/).some((w) => w.length > 3 && hay.includes(w));
    })?.id ?? null;
  const decision = resolveRouting(cls, {
    activeObra,
    realObraIds: realObras.map((o) => o.id),
    inboxObraId: inboxObra?.id ?? null,
    textMatchedObraId,
  });
  // Si no se puede identificar obra (action="ask" o sin target), va al Inbox SIN preguntar.
  // El chat captura; el orden fino se hace en el panel.
  const obraId = decision.targetObraId ?? inboxObra?.id ?? null;
  if (!obraId) { await finishJobs(burstJobIds, "done"); return; }
  const confident = decision.confident;

  // ⬇⬇ INVARIANTE: la confirmación de WhatsApp va DESPUÉS de que la entry esté en la base.
  // fileEntry lanza si el insert falla → la confirmación nunca se manda, el job se reintenta.
  // Nunca un "✓ guardé" sin un guardado real.
  await fileEntry({
    studioId, obraId, userId, inboundId: opts.inboundId, filing: primary,
    body, transcript, stored,
    confidence: primary?.obra_confidence ?? (confident ? 0.9 : 0.3),
    needsReview: decision.needsReview,
  });
  if (decision.setsActiveObra) await setActiveObra(studioId, userId, decision.setsActiveObra);

  const obraName = realObras.find((o) => o.id === obraId)?.name ?? "tu Inbox";
  await sendWhatsApp(
    from,
    `Listo${name ? `, ${name}` : ""} 👌 guardé ${countPhrase(stored)} en ${obraName}.${!confident ? " Cuando puedas, ordenalo desde el panel 🙂" : ""}`,
  );
  await logEvent(studioId, userId, "filed", { obra_id: obraId, confident });

  // Backup en Google Drive (opt-in por estudio). Best-effort: nunca rompe el archivado.
  // Sube las fotos pendientes (incluye las recién archivadas) y las marca como sincronizadas.
  if (stored.some((s) => s.isImage) && driveConfigured()) {
    try {
      await syncPendingPhotos(studioId, { limit: 12 });
    } catch (e) {
      console.error("[ingest] drive sync", e);
    }
  }

  await finishJobs(burstJobIds, "done");
}
