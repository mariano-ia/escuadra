"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/db/supabase";

export type AuthState = { error?: string } | null;

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const sb = await createServerClient();
  const { error } = await sb.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email o contraseña incorrectos." };
  redirect("/inbox");
}
