import "server-only";
import { createAdminClient } from "@/lib/db/supabase";
import type { Tables } from "@/lib/db/types";

export async function enqueueJob(inboundMessageId: string, studioId: string | null) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("processing_jobs")
    .insert({ inbound_message_id: inboundMessageId, studio_id: studioId })
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
