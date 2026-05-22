import "server-only";
import { createServerClient } from "@/lib/db/supabase";
import type { Tables } from "@/lib/db/types";

export type StudioContext = {
  user: { id: string; email: string | null };
  role: string;
  studio: Tables<"studios">;
};

/** Usuario autenticado (verificado contra Supabase Auth), o null. */
export async function getUser() {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

/**
 * Estudio activo del usuario (primer estudio del que es miembro). Lectura vía cliente
 * RLS-enforced: la DB solo devuelve estudios donde el usuario es miembro.
 */
export async function getActiveStudio(): Promise<StudioContext | null> {
  const sb = await createServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from("studio_members")
    .select("role, studios(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const studio = (data?.studios ?? null) as Tables<"studios"> | null;
  if (!studio) return null;

  return { user: { id: user.id, email: user.email ?? null }, role: data!.role, studio };
}
