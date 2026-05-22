import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/db/supabase";
import { downloadTwilioMedia, sendWhatsApp } from "@/lib/twilio/client";
import { uploadMedia } from "@/lib/storage";
import { transcribeAudio } from "@/lib/whisper/transcribe";
import { classifyMessage, type Classification, type Filing } from "@/lib/claude/classify";
import { finishJob } from "@/lib/jobs/queue";
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

  const { data: entry } = await admin.from("timeline_entries").insert({
    studio_id: opts.studioId, obra_id: opts.obraId, type, created_by_user_id: opts.userId,
    body_text: [opts.body, opts.transcript].filter(Boolean).join("\n") || null,
    source: "whatsapp", inbound_message_id: opts.inboundId, confidence: opts.confidence, needs_review: opts.needsReview,
  }).select("id").single();
  if (!entry) return;

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

/** Procesa un mensaje entrante: descarga media, transcribe, clasifica, archiva y confirma. */
export async function processInbound(opts: { jobId: string; inboundId: string }): Promise<void> {
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
  const body = (inbound.body ?? "").trim();
  const { data: profile } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const name = firstName(profile?.full_name ?? null);

  // --- Comando: fijar obra activa ---
  const cmd = body.match(/^(?:obra|trabajando en|pasame a|estoy en la? de)\s+(.{2,60})$/i);
  if (cmd && parseInt(raw.NumMedia ?? "0", 10) === 0) {
    const q = cmd[1].trim().toLowerCase();
    const { data: obras } = await admin.from("obras").select("id,name").eq("studio_id", studioId).eq("is_inbox", false);
    const match = (obras ?? []).find((o) => o.name.toLowerCase() === q) ?? (obras ?? []).find((o) => o.name.toLowerCase().includes(q));
    if (match) {
      await setActiveObra(studioId, userId, match.id);
      await sendWhatsApp(from, `Listo${name ? `, ${name}` : ""} 👷 ahora trabajás en ${match.name}. Mandá lo que quieras y lo guardo ahí.`);
      await logEvent(studioId, userId, "set_active_obra", { obra_id: match.id });
      await finishJob(opts.jobId, "done");
      return;
    }
  }

  // --- Descargar media ---
  const numMedia = parseInt(raw.NumMedia ?? "0", 10) || 0;
  const stored: Stored[] = [];
  const images: { mediaType: string; dataBase64: string }[] = [];
  let transcript: string | null = null;
  for (let i = 0; i < numMedia; i++) {
    const url = raw[`MediaUrl${i}`];
    const ct = raw[`MediaContentType${i}`] ?? "application/octet-stream";
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

  const { data: allObras } = await admin.from("obras").select("id,name,is_inbox").eq("studio_id", studioId);
  const realObras = (allObras ?? []).filter((o) => !o.is_inbox);
  const inboxObra = (allObras ?? []).find((o) => o.is_inbox);
  const activeObra = await getActiveObra(studioId, userId);
  const primary = cls.filings[0];

  // resolución de obra (cascada)
  let targetObraId: string | null = primary?.obra_id ?? null;
  let confident = (primary?.obra_confidence ?? 0) >= 0.65 && !!targetObraId;
  if (!targetObraId && !cls.needs_clarification) {
    if (activeObra) { targetObraId = activeObra; confident = true; }
    else if (realObras.length === 1) { targetObraId = realObras[0].id; confident = true; }
  }

  // funnel: aclaración
  if (!confident && (cls.needs_clarification || (!targetObraId && realObras.length > 1))) {
    const options = cls.clarification_options?.length ? cls.clarification_options : realObras.slice(0, 3).map((o) => o.name);
    await admin.from("pending_clarifications").insert({
      studio_id: studioId, user_id: userId,
      question: cls.clarification_question ?? "¿De qué obra es esto?",
      options, candidate_obras: realObras.slice(0, 4) as unknown as Json,
      partial_extraction: { inbound_id: opts.inboundId } as Json,
      expires_at: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
    });
    if (inboxObra) await fileEntry({ studioId, obraId: inboxObra.id, userId, inboundId: opts.inboundId, filing: primary, body, transcript, stored, confidence: primary?.obra_confidence ?? 0, needsReview: true });
    const numbered = options.map((o, i) => `${i + 1} ${o}`).join(" · ");
    await sendWhatsApp(from, `${cls.summary_es ? cls.summary_es + ". " : ""}${name ? name + ", " : ""}no tengo claro de qué obra es. ${numbered}${options.length ? " · " : ""}o lo dejo en tu Inbox.`);
    await logEvent(studioId, userId, "clarification_asked", {});
    await finishJob(opts.jobId, "awaiting_reply");
    return;
  }

  const obraId = targetObraId ?? inboxObra?.id;
  if (!obraId) { await finishJob(opts.jobId, "done"); return; }
  await fileEntry({ studioId, obraId, userId, inboundId: opts.inboundId, filing: primary, body, transcript, stored, confidence: primary?.obra_confidence ?? (confident ? 0.9 : 0.3), needsReview: !confident });
  if (confident && targetObraId) await setActiveObra(studioId, userId, targetObraId);

  const obraName = realObras.find((o) => o.id === obraId)?.name ?? "tu Inbox";
  await sendWhatsApp(from, `✓ Listo${name ? `, ${name}` : ""}. ${cls.summary_es || "Lo guardé"} — en ${obraName}.${!confident ? " (sin clasificar; ordenalo desde el panel)" : ""}`);
  await logEvent(studioId, userId, "filed", { obra_id: obraId, confident });
  await finishJob(opts.jobId, "done");
}
