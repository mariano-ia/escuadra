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

// ===================== Equipo: miembros e invitaciones =====================

/** Token de invitación inadivinable (18 bytes, base64url). */
export function inviteToken(): string {
  return randomBytes(18).toString("base64url");
}

/** Miembros del estudio (service role, studioId bakeado). studio_members y profiles
 *  no tienen FK directa (ambos referencian auth.users) → dos consultas + merge. */
export async function listStudioMembers(studioId: string) {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("studio_members")
    .select("user_id, role, joined_at")
    .eq("studio_id", studioId)
    .order("joined_at", { ascending: true });
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (members ?? []).map((m) => {
    const p = byId.get(m.user_id);
    return { userId: m.user_id, role: m.role, joinedAt: m.joined_at, name: p?.full_name ?? null, email: p?.email ?? null };
  });
}

/** Crea una invitación pendiente (TTL 7 días) y devuelve su token. */
export async function createStudioInvite(params: {
  studioId: string;
  email: string;
  role: "member" | "admin";
  createdBy: string;
}): Promise<{ token?: string; error?: string }> {
  const admin = createAdminClient();
  const email = params.email.toLowerCase().trim();
  // ¿ya es miembro? (busca el user por email en profiles)
  const { data: prof } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (prof) {
    const { data: member } = await admin.from("studio_members").select("id").eq("studio_id", params.studioId).eq("user_id", prof.id).maybeSingle();
    if (member) return { error: "Esa persona ya es parte del estudio." };
  }
  const token = inviteToken();
  const { error } = await admin.from("studio_invites").insert({
    studio_id: params.studioId,
    email,
    role: params.role,
    token,
    status: "pending",
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    created_by: params.createdBy,
  });
  if (error) return { error: "No se pudo crear la invitación." };
  return { token };
}

export async function listPendingInvites(studioId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("studio_invites")
    .select("id, email, role, token, created_at")
    .eq("studio_id", studioId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function revokeInvite(inviteId: string, studioId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("studio_invites").update({ status: "revoked" }).eq("id", inviteId).eq("studio_id", studioId);
}

export type InviteInfo = { studioId: string; studioName: string; email: string; role: string };

/** Datos de una invitación por token (solo si está vigente). Para la página pública de aceptar. */
export async function getInviteByToken(token: string): Promise<InviteInfo | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("studio_invites")
    .select("studio_id, email, role, status, expires_at, studios(name)")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.status !== "pending") return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  const studio = data.studios as { name: string } | null;
  return { studioId: data.studio_id, studioName: studio?.name ?? "el estudio", email: data.email, role: data.role };
}

/** Suma al usuario al estudio de la invitación (idempotente) y marca la invitación aceptada. */
export async function acceptInvite(params: { token: string; userId: string; email: string; fullName: string | null }): Promise<boolean> {
  const admin = createAdminClient();
  const { data: inv } = await admin.from("studio_invites").select("*").eq("token", params.token).maybeSingle();
  if (!inv || inv.status !== "pending" || new Date(inv.expires_at).getTime() < Date.now()) return false;
  await admin.from("profiles").upsert({ id: params.userId, email: params.email, full_name: params.fullName });
  await admin.from("studio_members").upsert(
    { studio_id: inv.studio_id, user_id: params.userId, role: inv.role, invited_by: inv.created_by },
    { onConflict: "studio_id,user_id" },
  );
  await admin.from("studio_invites").update({ status: "accepted" }).eq("id", inv.id);
  return true;
}

/** Reasigna una entry del Inbox (o de cualquier obra) a otra obra, arrastrando sus adjuntos. */
export async function moveEntryToObra(opts: { studioId: string; entryId: string; obraId: string }): Promise<void> {
  const admin = createAdminClient();
  const { entryId: e, studioId: st, obraId: ob } = opts;
  await admin.from("timeline_entries").update({ obra_id: ob, needs_review: false }).eq("id", e).eq("studio_id", st);
  await admin.from("photos").update({ obra_id: ob }).eq("timeline_entry_id", e).eq("studio_id", st);
  await admin.from("quotes").update({ obra_id: ob }).eq("timeline_entry_id", e).eq("studio_id", st);
  await admin.from("payments").update({ obra_id: ob }).eq("timeline_entry_id", e).eq("studio_id", st);
  await admin.from("approvals").update({ obra_id: ob }).eq("timeline_entry_id", e).eq("studio_id", st);
  await admin.from("issues").update({ obra_id: ob }).eq("timeline_entry_id", e).eq("studio_id", st);
}
