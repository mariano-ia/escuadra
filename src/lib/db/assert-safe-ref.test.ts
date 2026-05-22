import { describe, it, expect, beforeEach } from "vitest";
import { assertSafeRef, ESCUADRA_PROJECT_REF } from "./assert-safe-ref";

describe("assertSafeRef (allowlist estricto)", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_PROJECT_REF;
  });

  it("lanza con ref vacío", () => {
    expect(() => assertSafeRef(undefined)).toThrow(/vacío/);
    expect(() => assertSafeRef("")).toThrow();
  });

  it("bloquea el proyecto Argo (prod de otro producto)", () => {
    expect(() => assertSafeRef("luutdozbhinfiogugjbv")).toThrow(/PROHIBIDO/);
  });

  it("bloquea todos los proyectos preexistentes", () => {
    for (const ref of ["ajqjicwuqbxpgkrrnryn", "pzoiexlgzsbgjftzblgo", "cdklaxvxngmldpdiihgo"]) {
      expect(() => assertSafeRef(ref)).toThrow(/PROHIBIDO/);
    }
  });

  it("bloquea cualquier ref desconocido (no es el de Escuadra)", () => {
    expect(() => assertSafeRef("algunotroproyecto")).toThrow(/solo se permite/);
  });

  it("permite SOLO el proyecto de Escuadra", () => {
    expect(() => assertSafeRef(ESCUADRA_PROJECT_REF)).not.toThrow();
  });
});
