import {
  createBrowserClient as _createBrowserClient,
  createServerClient as _createServerClient,
} from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./types";
import { assertSafeRef, ESCUADRA_PROJECT_REF } from "./assert-safe-ref";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cliente browser (componentes cliente) — anon, sujeto a RLS. */
export function createBrowserClient() {
  return _createBrowserClient<Database>(URL, ANON);
}

/**
 * Cliente server (RSC / route handlers / server actions) — anon + sesión por cookies,
 * RLS-enforced. USAR para TODAS las lecturas del panel (defensa en profundidad: la DB
 * impone el aislamiento aunque el código falle). Ver skill escuadra-tenant-isolation.
 */
export async function createServerClient() {
  const cookieStore = await cookies();
  return _createServerClient<Database>(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // En RSC no se pueden setear cookies; el middleware refresca la sesión.
        }
      },
    },
  });
}

/**
 * Cliente admin (service role) — SOLO server (ingesta / cron / admin). Bypassa RLS.
 * Toda query debe filtrar por studio_id explícito; usar el repositorio tipado, no esto crudo.
 * La guarda assertSafeRef impide tocar cualquier proyecto que no sea escuadra-prod.
 */
let _admin: ReturnType<typeof createClient<Database>> | null = null;
export function createAdminClient() {
  assertSafeRef(process.env.SUPABASE_PROJECT_REF || ESCUADRA_PROJECT_REF);
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  if (!_admin) {
    _admin = createClient<Database>(URL, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}
