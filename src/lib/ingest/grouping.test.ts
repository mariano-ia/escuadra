import { describe, it, expect } from "vitest";
import { isImmediateText, isLatest, isSettled, combineBodies, GROUPING_WINDOW_MS } from "./grouping";

describe("isImmediateText", () => {
  it("comandos y 'guardá esto' (texto puro) → inmediato, no esperan la ventana", () => {
    expect(isImmediateText("obra Belgrano", 0)).toBe(true);
    expect(isImmediateText("guardá esto", 0)).toBe(true);
  });
  it("cualquier media → NO inmediato (entra a la ventana)", () => {
    expect(isImmediateText("obra Belgrano", 2)).toBe(false);
    expect(isImmediateText("mirá el avance", 3)).toBe(false);
  });
  it("texto normal (caption/nota) → NO inmediato", () => {
    expect(isImmediateText("quedó lindo el contrapiso", 0)).toBe(false);
  });
});

describe("isLatest", () => {
  it("soy el más nuevo → cierro el avance", () => {
    expect(isLatest(100, [10, 50, 100])).toBe(true);
  });
  it("llegó algo después → no cierro (lo hace el último)", () => {
    expect(isLatest(100, [10, 50, 100, 130])).toBe(false);
  });
});

describe("isSettled", () => {
  it("la ráfaga se asentó cuando pasó la ventana", () => {
    expect(isSettled(0, GROUPING_WINDOW_MS)).toBe(true);
    expect(isSettled(0, GROUPING_WINDOW_MS - 1)).toBe(false);
  });
});

describe("combineBodies", () => {
  it("une captions no vacíos y deduplica", () => {
    expect(combineBodies(["mirá el baño", null, "", "mirá el baño", "humedad arriba"])).toBe(
      "mirá el baño · humedad arriba",
    );
  });
  it("sin texto → string vacío", () => {
    expect(combineBodies([null, "", "  "])).toBe("");
  });
});
