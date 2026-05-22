import "server-only";
import { createAdminClient } from "@/lib/db/supabase";

const CODE_RE = /\bARQ-[A-Z0-9]{6,10}\b/i;

export function extractCode(text: string | null): string | null {
  if (!text) return null;
  const m = text.match(CODE_RE);
  return m ? m[0].toUpperCase() : null;
}

export async function resolveSender(
  phoneE164: string,
): Promise<{ studioId: string; userId: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("whatsapp_links")
    .select("studio_id, user_id")
    .eq("phone_e164", phoneE164)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return data ? { studioId: data.studio_id, userId: data.user_id } : null;
}

type LinkResult =
  | { ok: true; studioId: string; userId: string }
  | { ok: false; reason: "not_found" | "expired" | "used" };

export async function tryLinkByCode(opts: { phoneE164: string; code: string }): Promise<LinkResult> {
  const admin = createAdminClient();
  const { data: rec } = await admin
    .from("onboarding_codes")
    .select("*")
    .eq("code", opts.code)
    .maybeSingle();
  if (!rec) return { ok: false, reason: "not_found" };
  if (rec.consumed_at) return { ok: false, reason: "used" };
  if (new Date(rec.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  await admin.from("whatsapp_links").upsert(
    {
      studio_id: rec.studio_id,
      user_id: rec.user_id,
      phone_e164: opts.phoneE164,
      status: "active",
      verified_at: new Date().toISOString(),
    },
    { onConflict: "studio_id,phone_e164" },
  );
  await admin.from("onboarding_codes").update({ consumed_at: new Date().toISOString() }).eq("id", rec.id);
  return { ok: true, studioId: rec.studio_id, userId: rec.user_id };
}
