"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/db/supabase";
import { createStudioWithOwner } from "@/lib/db/repos";

export type AuthState = { error?: string } | null;

const schema = z.object({
  studioName: z.string().min(2, "El nombre del estudio es muy corto").max(80),
  fullName: z.string().min(2, "Tu nombre es muy corto").max(80),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(100),
});

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = schema.safeParse({
    studioName: formData.get("studioName"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { studioName, fullName, email, password } = parsed.data;

  const admin = createAdminClient();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (cErr || !created.user) {
    const msg = cErr?.message ?? "";
    return {
      error: /already|registered|exists/i.test(msg)
        ? "Ese email ya está registrado. Iniciá sesión."
        : "No se pudo crear la cuenta. Probá de nuevo.",
    };
  }

  await createStudioWithOwner({ userId: created.user.id, email, fullName, studioName });

  const sb = await createServerClient();
  const { error: sErr } = await sb.auth.signInWithPassword({ email, password });
  if (sErr) redirect("/login");
  redirect("/inbox");
}
