import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyMessage, CLASSIFIER_MODEL } from "@/lib/claude/classify";
import { FIXTURES } from "./fixtures";
import { CORPUS, type EvalCase } from "./corpus";
import { gradeCase, aggregate, type CaseResult } from "./grade";
import { renderReport } from "./report";

// Gateado: SOLO corre con RUN_EVAL=1 (gasta API). `npm test` normal lo saltea.
//   RUN_EVAL=1 npx vitest run tests/eval/classifier.eval.test.ts
//   RUN_EVAL=1 EVAL_LIMIT=8 npx vitest run ...   (corrida chica para probar/estimar)
const RUN = !!process.env.RUN_EVAL;
const LIMIT = process.env.EVAL_LIMIT ? parseInt(process.env.EVAL_LIMIT, 10) : CORPUS.length;
const CONCURRENCY = 4;

async function mapPool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

describe.skipIf(!RUN)("evaluación del clasificador (API real)", () => {
  it("corre el corpus y escribe el reporte", async () => {
    const cases = CORPUS.slice(0, LIMIT);
    const results = await mapPool<EvalCase, CaseResult>(cases, CONCURRENCY, async (c) => {
      const got = await classifyMessage({
        studioContext: FIXTURES[c.fixture],
        text: c.input.text ?? null,
        transcript: c.input.transcript ?? null,
        images: [],
      });
      return gradeCase(c, got);
    });

    const summary = aggregate(cases, results);
    const md = renderReport(summary, results, CLASSIFIER_MODEL);

    const dir = resolve(__dirname, "reports");
    mkdirSync(dir, { recursive: true });
    const file = resolve(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
    writeFileSync(file, md, "utf8");

    // resumen a consola
    console.log(`\n=== EVAL: ${summary.fullyPassed}/${summary.total} casos 100% OK ===`);
    console.log(`Reporte: ${file}\n`);
    console.log(md);

    expect(results.length).toBe(cases.length);
  });
});
