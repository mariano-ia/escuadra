import { describe, it, expect } from "vitest";
import type { Classification } from "@/lib/claude/classify";
import type { EvalCase } from "./corpus";
import { gradeCase, aggregate } from "./grade";

// Tests GRATIS (sin API) que verifican que el calificador es correcto.
// Garantizan que las métricas del reporte son confiables.

function cls(over: Partial<Classification> & { obra_id?: string | null; obra_confidence?: number }): Classification {
  return {
    intent: over.intent ?? "archivar",
    filings: over.filings ?? [
      {
        obra_id: over.obra_id ?? null,
        obra_confidence: over.obra_confidence ?? 0.9,
        content_type: "note",
        album_hint: null,
        fields: {},
      },
    ],
    needs_clarification: over.needs_clarification ?? false,
    clarification_question: null,
    clarification_options: [],
    summary_es: over.summary_es ?? "ok",
  };
}

const caseAmbiguous: EvalCase = {
  id: "T1", family: "AM", note: "x", fixture: "tres-obras",
  input: { text: "guardá" }, expect: { obraId: null, shouldClarify: true },
};

describe("gradeCase", () => {
  it("acierta obra null + clarify true", () => {
    const r = gradeCase(caseAmbiguous, cls({ obra_id: null, needs_clarification: true }));
    expect(r.passed).toBe(true);
  });

  it("marca fallo si NO pregunta cuando debía (FN del funnel)", () => {
    const r = gradeCase(caseAmbiguous, cls({ obra_id: null, needs_clarification: false }));
    expect(r.passed).toBe(false);
    expect(r.dims.find((d) => d.dim === "clarify")?.pass).toBe(false);
  });

  it("normaliza montos (480000 === 480000)", () => {
    const c: EvalCase = { id: "T2", family: "MF", note: "x", fixture: "una-obra", input: { text: "x" }, expect: { amount: 480000 } };
    const got = cls({});
    got.filings[0].fields.amount = 480000;
    expect(gradeCase(c, got).passed).toBe(true);
  });

  it("matchea obra por id exacto o substring", () => {
    const c: EvalCase = { id: "T3", family: "AM", note: "x", fixture: "tres-obras", input: { text: "x" }, expect: { obraId: "obra-belgrano" } };
    expect(gradeCase(c, cls({ obra_id: "obra-belgrano" })).passed).toBe(true);
    expect(gradeCase(c, cls({ obra_id: "obra-palermo" })).passed).toBe(false);
  });
});

describe("aggregate", () => {
  it("cuenta la confusión del funnel y la calibración", () => {
    const cases: EvalCase[] = [caseAmbiguous];
    const results = [gradeCase(caseAmbiguous, cls({ obra_id: null, needs_clarification: false }))];
    const s = aggregate(cases, results);
    expect(s.clarify.fn).toBe(1); // debió preguntar y no lo hizo
    expect(s.total).toBe(1);
  });
});
