import type { Classification } from "@/lib/claude/classify";
import type { EvalCase } from "./corpus";

export type DimResult = { dim: string; expected: unknown; got: unknown; pass: boolean };

export type CaseResult = {
  id: string;
  family: EvalCase["family"];
  note: string;
  input: string;
  gotIntent: string;
  gotObra: string | null;
  gotConf: number;
  gotClarify: boolean;
  gotType: string | null;
  gotSummary: string;
  dims: DimResult[];
  passed: boolean;
};

function sameObra(expected: string | null, got: string | null): boolean {
  const e = (expected ?? "").trim();
  const g = (got ?? "").trim();
  if (!e && !g) return true;
  if (!e || !g) return false;
  return e === g || g.includes(e) || e.includes(g);
}

function numEq(expected: number | null | undefined, got: number | null | undefined): boolean {
  const e = expected ?? null;
  const g = got ?? null;
  if (e === null && g === null) return true;
  if (e === null || g === null) return false;
  return Number(e) === Number(g);
}

function includesCI(haystack: string | null | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

export function gradeCase(c: EvalCase, got: Classification): CaseResult {
  const primary = got.filings?.[0];
  const dims: DimResult[] = [];
  const e = c.expect;
  const push = (dim: string, expected: unknown, gotV: unknown, pass: boolean) =>
    dims.push({ dim, expected, got: gotV, pass });

  if (e.intent !== undefined) push("intent", e.intent, got.intent, e.intent === got.intent);
  if (e.obraId !== undefined) {
    const g = primary?.obra_id ?? null;
    push("obra", e.obraId, g, sameObra(e.obraId, g));
  }
  if (e.shouldClarify !== undefined)
    push("clarify", e.shouldClarify, !!got.needs_clarification, e.shouldClarify === !!got.needs_clarification);
  if (e.contentType !== undefined)
    push("content_type", e.contentType, primary?.content_type ?? null, e.contentType === primary?.content_type);
  if (e.amount !== undefined)
    push("amount", e.amount, primary?.fields?.amount ?? null, numEq(e.amount, primary?.fields?.amount));
  if (e.currency !== undefined)
    push("currency", e.currency, primary?.fields?.currency ?? "ARS", (primary?.fields?.currency ?? "ARS") === e.currency);
  if (e.provider !== undefined)
    push("provider", e.provider, primary?.fields?.provider_name ?? null, includesCI(primary?.fields?.provider_name, e.provider));

  return {
    id: c.id,
    family: c.family,
    note: c.note,
    input: c.input.text ?? (c.input.transcript ? `🎙 ${c.input.transcript}` : "(media)"),
    gotIntent: got.intent,
    gotObra: primary?.obra_id ?? null,
    gotConf: primary?.obra_confidence ?? 0,
    gotClarify: !!got.needs_clarification,
    gotType: primary?.content_type ?? null,
    gotSummary: got.summary_es ?? "",
    dims,
    passed: dims.length > 0 && dims.every((d) => d.pass),
  };
}

// ---------- agregación ----------

export type Confusion = { tp: number; fp: number; fn: number; tn: number };

export type CalibrationBucket = { label: string; n: number; correct: number };

export type Summary = {
  total: number;
  fullyPassed: number;
  perDim: Record<string, { correct: number; total: number }>;
  perFamily: Record<string, { passed: number; total: number }>;
  clarify: Confusion;
  calibration: CalibrationBucket[];
  intentMismatches: { id: string; expected: unknown; got: unknown }[];
  typeMismatches: { id: string; expected: unknown; got: unknown }[];
};

const BUCKETS: { label: string; lo: number; hi: number }[] = [
  { label: "0.00–0.50", lo: 0, hi: 0.5 },
  { label: "0.50–0.65", lo: 0.5, hi: 0.65 },
  { label: "0.65–0.85", lo: 0.65, hi: 0.85 },
  { label: "0.85–1.00", lo: 0.85, hi: 1.0001 },
];

export function aggregate(cases: EvalCase[], results: CaseResult[]): Summary {
  const perDim: Summary["perDim"] = {};
  const perFamily: Summary["perFamily"] = {};
  const clarify: Confusion = { tp: 0, fp: 0, fn: 0, tn: 0 };
  const calibration: CalibrationBucket[] = BUCKETS.map((b) => ({ label: b.label, n: 0, correct: 0 }));
  const intentMismatches: Summary["intentMismatches"] = [];
  const typeMismatches: Summary["typeMismatches"] = [];

  results.forEach((r, i) => {
    const fam = perFamily[r.family] ?? { passed: 0, total: 0 };
    fam.total++;
    if (r.passed) fam.passed++;
    perFamily[r.family] = fam;

    for (const d of r.dims) {
      const slot = perDim[d.dim] ?? { correct: 0, total: 0 };
      slot.total++;
      if (d.pass) slot.correct++;
      perDim[d.dim] = slot;

      if (d.dim === "intent" && !d.pass) intentMismatches.push({ id: r.id, expected: d.expected, got: d.got });
      if (d.dim === "content_type" && !d.pass) typeMismatches.push({ id: r.id, expected: d.expected, got: d.got });
    }

    // matriz de confusión del funnel de aclaración
    const exp = cases[i].expect.shouldClarify;
    if (exp !== undefined) {
      if (exp && r.gotClarify) clarify.tp++;
      else if (!exp && r.gotClarify) clarify.fp++;
      else if (exp && !r.gotClarify) clarify.fn++;
      else clarify.tn++;
    }

    // calibración: solo casos donde conocemos la obra verdadera
    const obraDim = r.dims.find((d) => d.dim === "obra");
    if (obraDim) {
      const b = BUCKETS.findIndex((x) => r.gotConf >= x.lo && r.gotConf < x.hi);
      if (b >= 0) {
        calibration[b].n++;
        if (obraDim.pass) calibration[b].correct++;
      }
    }
  });

  return {
    total: results.length,
    fullyPassed: results.filter((r) => r.passed).length,
    perDim,
    perFamily,
    clarify,
    calibration,
    intentMismatches,
    typeMismatches,
  };
}
