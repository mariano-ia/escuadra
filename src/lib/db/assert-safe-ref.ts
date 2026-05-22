/**
 * Guarda de seguridad multi-tenant (allowlist, no denylist).
 *
 * Nunca operar sobre un proyecto Supabase que no sea el de Escuadra. Lanza salvo que el `ref`
 * sea EXACTAMENTE el proyecto registrado en `SUPABASE_PROJECT_REF`. El ref `luutdozbhinfiogugjbv`
 * es la prod productiva de OTRO producto — jamás tocarlo.
 *
 * Ver: .claude/skills/escuadra-tenant-isolation.
 */
const FORBIDDEN_REFS: readonly string[] = ["luutdozbhinfiogugjbv"];

export function assertSafeRef(ref: string | undefined | null): asserts ref is string {
  if (!ref) {
    throw new Error("assertSafeRef: ref vacío — se requiere el ref explícito del proyecto Escuadra.");
  }
  if (FORBIDDEN_REFS.includes(ref)) {
    throw new Error(`assertSafeRef: ref PROHIBIDO (${ref}). Es la prod de otro producto. Abortado.`);
  }
  const expected = process.env.SUPABASE_PROJECT_REF;
  if (expected && ref !== expected) {
    throw new Error(
      `assertSafeRef: ref "${ref}" no coincide con el proyecto registrado "${expected}". Abortado.`,
    );
  }
}
