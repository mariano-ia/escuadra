import { describe, it, expect } from "vitest";
import type { Classification } from "@/lib/claude/classify";
import { resolveRouting, parseObraCommand, isBareSaveLeadIn, type RoutingState } from "./route";

function cls(over: { obra_id?: string | null; conf?: number; needs?: boolean }): Classification {
  return {
    intent: "archivar",
    filings: [{ obra_id: over.obra_id ?? null, obra_confidence: over.conf ?? 0, content_type: "note", album_hint: null, fields: {} }],
    needs_clarification: over.needs ?? false,
    clarification_question: null,
    clarification_options: [],
    summary_es: "ok",
  };
}

const tres: RoutingState = { activeObra: null, realObraIds: ["a", "b", "c"], inboxObraId: "inbox" };

describe("resolveRouting (cascada de obra)", () => {
  it("obra explícita con confianza alta → archiva y fija activa", () => {
    const d = resolveRouting(cls({ obra_id: "a", conf: 0.9 }), tres);
    expect(d.action).toBe("file");
    expect(d.targetObraId).toBe("a");
    expect(d.confident).toBe(true);
    expect(d.setsActiveObra).toBe("a");
  });

  it("obra_id alucinado por el LLM (no pertenece al estudio) → NUNCA se archiva ahí (C5)", () => {
    // El clasificador devolvió un id inventado ("ssdsoij11223") con confianza alta.
    // Si lo confiáramos, el insert con ese obra_id falla y el mensaje se pierde en silencio.
    const d = resolveRouting(cls({ obra_id: "ssdsoij11223", conf: 0.95 }), tres);
    expect(d.targetObraId).not.toBe("ssdsoij11223");
    expect(d.action).toBe("ask"); // 2+ obras y sin otra señal → preguntar
    expect(d.targetObraId).toBe("inbox");
    expect(d.confident).toBe(false);
  });

  it("obra_id alucinado pero CON obra activa → usa la activa, ignora el id falso", () => {
    const d = resolveRouting(cls({ obra_id: "id-que-no-existe", conf: 0.95 }), { ...tres, activeObra: "b" });
    expect(d.targetObraId).toBe("b");
    expect(d.confident).toBe(true);
  });

  it("sin obra en el mensaje pero CON obra activa → hereda la activa (memoria de sesión)", () => {
    const d = resolveRouting(cls({ obra_id: null }), { ...tres, activeObra: "b" });
    expect(d.action).toBe("file");
    expect(d.targetObraId).toBe("b");
    expect(d.confident).toBe(true);
  });

  it("sin obra y una sola obra en el estudio → esa", () => {
    const d = resolveRouting(cls({ obra_id: null }), { activeObra: null, realObraIds: ["solo"], inboxObraId: "inbox" });
    expect(d.targetObraId).toBe("solo");
  });

  it("sin obra, sin activa, 2+ candidatas → pregunta y parquea en Inbox", () => {
    const d = resolveRouting(cls({ obra_id: null }), tres);
    expect(d.action).toBe("ask");
    expect(d.targetObraId).toBe("inbox");
    expect(d.needsReview).toBe(true);
  });

  it("obra activa GANA sobre needs_clarification del LLM (el usuario la fijó a propósito)", () => {
    const d = resolveRouting(cls({ obra_id: null, needs: true }), { ...tres, activeObra: "b" });
    expect(d.action).toBe("file");
    expect(d.targetObraId).toBe("b");
    expect(d.confident).toBe(true);
  });

  it("el texto nombra una obra (textMatchedObraId) → archiva ahí aunque el LLM dude", () => {
    const d = resolveRouting(cls({ obra_id: null, needs: true }), { ...tres, textMatchedObraId: "c" });
    expect(d.action).toBe("file");
    expect(d.targetObraId).toBe("c");
    expect(d.confident).toBe(true);
  });

  it("obra nombrada pero con poca confianza (<0.65) → archiva ahí marcado 'sin clasificar', NO pregunta", () => {
    // Comportamiento real: el funnel solo se dispara con needs_clarification del LLM
    // o cuando NO hay obra. Una obra nombrada con baja confianza pasa como file+needsReview.
    const d = resolveRouting(cls({ obra_id: "a", conf: 0.4 }), tres);
    expect(d.action).toBe("file");
    expect(d.targetObraId).toBe("a");
    expect(d.confident).toBe(false);
    expect(d.needsReview).toBe(true);
  });
});

describe("parseObraCommand", () => {
  it("detecta variantes de comando", () => {
    expect(parseObraCommand("obra Belgrano")).toBe("Belgrano");
    expect(parseObraCommand("pasame a Palermo")).toBe("Palermo");
    expect(parseObraCommand("trabajando en Núñez")).toBe("Núñez");
  });
  it("ignora texto que no es comando", () => {
    expect(parseObraCommand("colocaron las ventanas del piso 2")).toBeNull();
    expect(parseObraCommand("hola")).toBeNull();
  });
});

describe("isBareSaveLeadIn (guardá esto sin contenido)", () => {
  it("detecta lead-ins vacíos (incluso con acentos y muletillas)", () => {
    expect(isBareSaveLeadIn("guardá esto")).toBe(true);
    expect(isBareSaveLeadIn("che guardá esto que es importante")).toBe(true);
    expect(isBareSaveLeadIn("mirá esto")).toBe(true);
    expect(isBareSaveLeadIn("te mando algo")).toBe(true);
    expect(isBareSaveLeadIn("guardame esto porfa")).toBe(true);
  });
  it("NO matchea cuando hay contenido real", () => {
    expect(isBareSaveLeadIn("guardá esto: el plomero cobra 480 lucas")).toBe(false);
    expect(isBareSaveLeadIn("colocaron las ventanas del piso 2")).toBe(false);
    expect(isBareSaveLeadIn("obra belgrano")).toBe(false);
    expect(isBareSaveLeadIn("aprobado el presupuesto de pintura en Núñez")).toBe(false);
  });
});
