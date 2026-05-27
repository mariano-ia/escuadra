"use server";

import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/db/supabase";
import { getUser } from "@/lib/auth/session";
import { getInviteByToken, acceptInvite } from "@/lib/db/repos";

export type AcceptState = { error?: string } | null;

/** Invitado NUEVO: crea su cuenta con el email de la invitación y entra al estudio. */
export async function acceptInviteAction(_prev: AcceptState, formData: FormData): Promise<AcceptState> {
  const token = String(formData.get("token") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (fullName.length < 2) return { error: "Tu nombre es muy corto." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const invite = await getInviteByToken(token);
  if (!invite) return { error: "La invitación venció o no es válida. Pedí una nueva al estudio." };

  const admin = createAdminClient();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (cErr || !created.user) {
    if (/already|registered|exists/i.test(cErr?.message ?? "")) {
      return { error: "Ese email ya tiene cuenta. Iniciá sesión y volvé a abrir este link para unirte." };
    }
    return { error: "No se pudo crear la cuenta. Probá de nuevo." };
  }

  const ok = await acceptInvite({ token, userId: created.user.id, email: invite.email, fullName });
  if (!ok) return { error: "La invitación venció o no es válida." };

  const sb = await createServerClient();
  const { error: sErr } = await sb.auth.signInWithPassword({ email: invite.email, password });
  if (sErr) redirect("/login");
  redirect("/inbox");
}

/** Usuario YA logueado: se suma al estudio de la invitación con su cuenta actual. */
export async function joinAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const user = await getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  await acceptInvite({ token, userId: user.id, email: user.email ?? "", fullName: prof?.full_name ?? null });
  redirect("/inbox");
}
