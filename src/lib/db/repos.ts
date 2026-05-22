import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "./supabase";
import type { Tables } from "./types";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "estudio"
  );
}

/** Código de vinculación ARQ-XXXXXXXX (8 chars, charset sin ambiguos). */
export function generateOnboardingCode(): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = randomBytes(8);
  let s = "";
  for (let i = 0; i < 8; i++) s += charset[b[i] % charset.length];
  return `ARQ-${s}`;
}

/**
 * Crea estudio + owner + suscripción trial + obra Inbox + código de vinculación.
 * Todo con service role y studio_id explícito (ver skill escuadra-tenant-isolation).
 */
export async function createStudioWithOwner(params: {
  userId: string;
  email: string;
  fullName: string | null;
  studioName: string;
}): Promise<{ studio: Tables<"studios">; code: string }> {
  const admin = createAdminClient();

  await admin
    .from("profiles")
    .upsert({ id: params.userId, email: params.email, full_name: params.fullName });

  const base = slugify(params.studioName);
  let slug = base;
  let n = 1;
  // slug único
  for (;;) {
    const { data } = await admin.from("studios").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${++n}`;
  }

  const { data: studio, error } = await admin
    .from("studios")
    .insert({ name: params.studioName, slug, plan_id: "starter" })
    .select()
    .single();
  if (error || !studio) throw error ?? new Error("No se pudo crear el estudio");

  await admin
    .from("studio_members")
    .insert({ studio_id: studio.id, user_id: params.userId, role: "owner" });
  await admin
    .from("subscriptions")
    .insert({ studio_id: studio.id, plan_id: "starter", status: "trial" });
  // Obra Inbox ("Sin clasificar") — red de seguridad universal del estudio
  await admin
    .from("obras")
    .insert({ studio_id: studio.id, name: "Sin clasificar", is_inbox: true, created_by: params.userId });

  const code = generateOnboardingCode();
  await admin.from("onboarding_codes").insert({
    code,
    studio_id: studio.id,
    user_id: params.userId,
    email: params.email,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });

  return { studio, code };
}

/** Genera un código de vinculación fresco (TTL 15 min) para un estudio/usuario. */
export async function freshOnboardingCode(
  studioId: string,
  userId: string,
  email: string,
): Promise<string> {
  const admin = createAdminClient();
  const code = generateOnboardingCode();
  await admin.from("onboarding_codes").insert({
    code,
    studio_id: studioId,
    user_id: userId,
    email,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
  return code;
}

/** Crea una obra con sus álbumes por defecto. */
export async function createObra(params: {
  studioId: string;
  userId: string;
  name: string;
  address?: string | null;
  clientName?: string | null;
}): Promise<string> {
  const admin = createAdminClient();
  const { data: obra, error } = await admin
    .from("obras")
    .insert({
      studio_id: params.studioId,
      name: params.name,
      address: params.address ?? null,
      client_name: params.clientName ?? null,
      created_by: params.userId,
    })
    .select("id")
    .single();
  if (error || !obra) throw error ?? new Error("No se pudo crear la obra");
  await admin.rpc("create_default_albums", { p_obra: obra.id, p_studio: params.studioId });
  return obra.id;
}
