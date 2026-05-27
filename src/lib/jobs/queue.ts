import "server-only";
import { createAdminClient } from "@/lib/db/supabase";
import type { Tables } from "@/lib/db/types";

export async function enqueueJob(inboundMessageId: string, studioId: string | null, delayMs = 0) {
  const admin = createAdminClient();
  // delayMs > 0 retrasa la elegibilidad del cron (next_attempt_at): para media, así el cron
  // no procesa el mensaje "suelto" mientras el after() está agrupando la ráfaga (~90s).
  const { data } = await admin
    .from("processing_jobs")
    .insert({
      inbound_message_id: inboundMessageId,
      studio_id: studioId,
      next_attempt_at: new Date(Date.now() + delayMs).toISOString(),
    })
    .select()
    .single();
  return data;
}

/** Reclama un job de forma atómica (guard optimista por status). Devuelve null si otro lo tomó. */
export async function claimNextJob(): Promise<Tables<"processing_jobs"> | null> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: job } = await admin
    .from("processing_jobs")
    .select("*")
    .in("status", ["queued", "failed"])
    .lte("next_attempt_at", nowIso)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!job) return null;
  const { data: claimed } = await admin
    .from("processing_jobs")
    .update({ status: "processing", attempts: job.attempts + 1, locked_at: nowIso })
    .eq("id", job.id)
    .eq("status", job.status)
    .select()
    .maybeSingle();
  return claimed ?? null;
}

export async function finishJob(id: string, status: "done" | "awaiting_reply") {
  const admin = createAdminClient();
  await admin.from("processing_jobs").update({ status }).eq("id", id);
}

export type PendingJob = { jobId: string; inboundId: string; receivedAtMs: number };

/** Jobs aún 'queued' del mismo remitente (últimos ~5 min), para juntar una ráfaga en un avance. */
export async function pendingInboundsForSender(fromPhone: string, studioId: string): Promise<PendingJob[]> {
  const admin = createAdminClient();
  const sinceIso = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data } = await admin
    .from("processing_jobs")
    .select("id, inbound_message_id, inbound_messages!inner(from_phone, received_at)")
    .eq("studio_id", studioId)
    .eq("status", "queued")
    .eq("inbound_messages.from_phone", fromPhone)
    .gte("inbound_messages.received_at", sinceIso)
    .order("created_at", { ascending: true });
  return (data ?? [])
    .filter((j): j is typeof j & { inbound_message_id: string } => !!j.inbound_message_id)
    .map((j) => {
      const im = j.inbound_messages as unknown as { received_at: string };
      return { jobId: j.id, inboundId: j.inbound_message_id, receivedAtMs: new Date(im.received_at).getTime() };
    });
}

/** Reclama varios jobs de forma atómica (queued→processing). Devuelve los ids efectivamente tomados. */
export async function claimJobs(jobIds: string[]): Promise<string[]> {
  if (jobIds.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("processing_jobs")
    .update({ status: "processing", locked_at: new Date().toISOString() })
    .in("id", jobIds)
    .eq("status", "queued")
    .select("id");
  return (data ?? []).map((j) => j.id);
}

export async function finishJobs(jobIds: string[], status: "done" | "awaiting_reply") {
  if (jobIds.length === 0) return;
  const admin = createAdminClient();
  await admin.from("processing_jobs").update({ status }).in("id", jobIds);
}

export async function failJob(id: string, attempts: number, maxAttempts: number, err: string) {
  const admin = createAdminClient();
  const backoffSec = Math.min(60 * 2 ** attempts, 3600);
  await admin
    .from("processing_jobs")
    .update({
      status: attempts >= maxAttempts ? "dead" : "failed",
      next_attempt_at: new Date(Date.now() + backoffSec * 1000).toISOString(),
      last_error: err.slice(0, 500),
    })
    .eq("id", id);
}
