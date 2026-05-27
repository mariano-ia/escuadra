"use server";

import { revalidatePath } from "next/cache";
import { getActiveStudio } from "@/lib/auth/session";
import { createStudioInvite, revokeInvite } from "@/lib/db/repos";

export type InviteState = { token?: string; email?: string; error?: string } | null;

export async function createInviteAction(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const ctx = await getActiveStudio();
  if (!ctx) return { error: "Sesión expirada." };
  if (ctx.role !== "owner" && ctx.role !== "admin") return { error: "Solo el dueño o un admin pueden invitar." };

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "member") === "admin" ? "admin" : "member";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Email inválido." };

  const res = await createStudioInvite({ studioId: ctx.studio.id, email, role, createdBy: ctx.user.id });
  if (res.error) return { error: res.error };
  revalidatePath("/equipo");
  return { token: res.token, email };
}

export async function revokeInviteAction(formData: FormData): Promise<void> {
  const ctx = await getActiveStudio();
  if (!ctx || (ctx.role !== "owner" && ctx.role !== "admin")) return;
  const id = String(formData.get("inviteId") ?? "");
  if (id) await revokeInvite(id, ctx.studio.id);
  revalidatePath("/equipo");
}
