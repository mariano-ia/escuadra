import "server-only";
import { createAdminClient } from "@/lib/db/supabase";

/**
 * Rate limiter basado en Postgres (sin Redis). Best-effort (ventana fija).
 * Devuelve true si la operación está PERMITIDA, false si superó el límite.
 */
export async function rateLimit(bucketKey: string, max: number, windowSec: number): Promise<boolean> {
  const admin = createAdminClient();
  const windowStart = new Date(
    Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000,
  ).toISOString();
  try {
    const { data } = await admin
      .from("rate_limits")
      .select("count")
      .eq("bucket_key", bucketKey)
      .eq("window_start", windowStart)
      .maybeSingle();
    const count = (data?.count ?? 0) + 1;
    await admin
      .from("rate_limits")
      .upsert({ bucket_key: bucketKey, window_start: windowStart, count }, { onConflict: "bucket_key,window_start" });
    return count <= max;
  } catch {
    return true; // ante fallo del limiter, no bloquear
  }
}
