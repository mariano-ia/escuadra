/**
 * Guarda de seguridad multi-tenant — ALLOWLIST ESTRICTO.
 *
 * SOLO el proyecto Supabase de Escuadra (`ehvsfintmkoclqehqwdv`) puede tocarse.
 * TODOS los proyectos preexistentes en la org "Yacaré" están PROHIBIDOS (regla explícita del
 * usuario): jamás escribir/migrar/ejecutar SQL en ellos.
 *
 * Llamar antes de toda operación de escritura sobre Supabase. Ver skill escuadra-tenant-isolation.
 */
export const ESCUADRA_PROJECT_REF = "ehvsfintmkoclqehqwdv";

// Proyectos preexistentes — JAMÁS tocar (defensa explícita, además del allowlist):
const FORBIDDEN_REFS: readonly string[] = [
  "luutdozbhinfiogugjbv", // Argo (prod de otro producto)
  "ajqjicwuqbxpgkrrnryn", // elpantano
  "pzoiexlgzsbgjftzblgo", // argo-smo
  "cdklaxvxngmldpdiihgo", // leads-scrapper
];

export function assertSafeRef(ref: string | undefined | null): asserts ref is string {
  if (!ref) {
    throw new Error("assertSafeRef: ref vacío — se requiere el ref explícito del proyecto Escuadra.");
  }
  if (FORBIDDEN_REFS.includes(ref)) {
    throw new Error(`assertSafeRef: ref PROHIBIDO (${ref}) — es un proyecto preexistente. Abortado.`);
  }
  const allowed = process.env.SUPABASE_PROJECT_REF || ESCUADRA_PROJECT_REF;
  if (ref !== allowed) {
    throw new Error(
      `assertSafeRef: solo se permite el proyecto de Escuadra (${allowed}); recibido "${ref}". Abortado.`,
    );
  }
}
