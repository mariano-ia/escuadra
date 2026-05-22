import { describe, it, expect, beforeEach } from "vitest";
import { assertSafeRef } from "./assert-safe-ref";

describe("assertSafeRef", () => {
  beforeEach(() => {
    delete process.env.SUPABASE_PROJECT_REF;
  });

  it("lanza con el ref prohibido (prod de otro producto)", () => {
    expect(() => assertSafeRef("luutdozbhinfiogugjbv")).toThrow(/PROHIBIDO/);
  });

  it("lanza con ref vacío", () => {
    expect(() => assertSafeRef(undefined)).toThrow(/vacío/);
    expect(() => assertSafeRef("")).toThrow();
  });

  it("lanza si no coincide con el proyecto registrado", () => {
    process.env.SUPABASE_PROJECT_REF = "escuadrarefabc123";
    expect(() => assertSafeRef("otroproyecto")).toThrow(/no coincide/);
  });

  it("pasa con el ref registrado de Escuadra", () => {
    process.env.SUPABASE_PROJECT_REF = "escuadrarefabc123";
    expect(() => assertSafeRef("escuadrarefabc123")).not.toThrow();
  });
});
