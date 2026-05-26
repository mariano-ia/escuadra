import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { classifyMessage, CLASSIFIER_MODEL } from "@/lib/claude/classify";
import { FIXTURES } from "./fixtures";
import type { EvalCase } from "./corpus";
import { gradeCase, aggregate, type CaseResult } from "./grade";
import { renderReport } from "./report";
import { PERSONAS } from "./sim/personas";
import { generateDay } from "./sim/generate";
import { messagesToArchitectDays, projectScale, SCALE_PRESETS, USAGE, PRICING } from "./sim/usage-model";

// Simulación de uso SIN usuarios reales: un "arquitecto robot" genera un día de
// mensajes y los corremos por el clasificador. Gateado por RUN_SIM (gasta API).
//   RUN_SIM=1 SIM_MESSAGES=20 SIM_PERSONA=apurado npx vitest run tests/eval/sim.eval.test.ts
const RUN = !!process.env.RUN_SIM;
const N = process.env.SIM_MESSAGES ? parseInt(process.env.SIM_MESSAGES, 10) : USAGE.msgsPerArchitectDay;
const PERSONA = process.env.SIM_PERSONA ?? "apurado";
const CONCURRENCY = 4;

async function mapPool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

describe.skipIf(!RUN)("simulación de uso (arquitecto robot)", () => {
  it("genera un día y corre el clasificador", async () => {
    const persona = PERSONAS[PERSONA] ?? PERSONAS["apurado"];
    const cases: EvalCase[] = await generateDay(persona, N);

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
    const archDays = messagesToArchitectDays(cases.length);

    // encabezado de escala: qué representa esta corrida + proyección de costo
    const scaleLines = [
      `## Escala simulada`,
      "",
      `- Esta corrida: **${cases.length} mensajes** ≈ **${archDays.toFixed(1)} día(s) de un arquitecto** (persona: ${persona.label}).`,
      `- Costo de ESTA corrida (aprox): $${(cases.length * PRICING.classifyCallUsd).toFixed(3)} (clasificación) + 1 generación.`,
      "",
      `### Proyección a escalas mayores (a accuracy y costo de hoy)`,
      "",
      `| Escala | Mensajes | Costo API aprox |`,
      `|---|---|---|`,
      ...Object.entries(SCALE_PRESETS).map(([name, s]) => {
        const p = projectScale(s);
        return `| ${name} | ${p.messages.toLocaleString("es-AR")} | $${p.estUsd.toFixed(2)} |`;
      }),
      "",
      `> Mensajes/arquitecto-día asumido: ${USAGE.msgsPerArchitectDay} · ambigüedad: ${Math.round(USAGE.ambiguityRate * 100)}%. Ajustar en usage-model.ts con datos reales.`,
      "",
    ].join("\n");

    const md = scaleLines + "\n" + renderReport(summary, results, CLASSIFIER_MODEL);
    const dir = resolve(__dirname, "reports");
    mkdirSync(dir, { recursive: true });
    const file = resolve(dir, `sim-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
    writeFileSync(file, md, "utf8");

    console.log(`\n=== SIM: ${cases.length} msgs (${archDays.toFixed(1)} arq-día) · ${summary.fullyPassed}/${summary.total} OK ===`);
    console.log(`Reporte: ${file}\n`);
    console.log(md);

    expect(results.length).toBe(cases.length);
  });
});
