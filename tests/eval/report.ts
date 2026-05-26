import type { CaseResult, Summary } from "./grade";

const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((100 * n) / d)}%`);

/** Deriva oportunidades de mejora accionables a partir de los fallos. */
function opportunities(s: Summary, results: CaseResult[]): string[] {
  const out: string[] = [];

  // Funnel sub-disparado: ambiguo que NO preguntó (riesgo: archiva mal en silencio)
  if (s.clarify.fn > 0)
    out.push(
      `**Funnel sub-disparado (${s.clarify.fn} caso/s):** mensajes ambiguos que NO pidieron aclaración → se archivarían en la obra equivocada en silencio. Es el "unknown-unknown" de aprendizaje-y-auditoria.md. Reforzar el disparo de needs_clarification o mover la decisión a señales estructurales (no al auto-reporte del modelo).`,
    );
  // Funnel sobre-disparado: preguntó de más (fricción)
  if (s.clarify.fp > 0)
    out.push(
      `**Funnel sobre-disparado (${s.clarify.fp} caso/s):** pidió aclaración cuando la obra era resoluble → fricción innecesaria, va contra "casi nunca pregunta".`,
    );

  // Montos
  const amount = s.perDim["amount"];
  if (amount && amount.correct < amount.total) {
    const failed = results.filter((r) => r.dims.some((d) => d.dim === "amount" && !d.pass));
    out.push(
      `**Extracción de montos (${amount.total - amount.correct}/${amount.total} fallan):** revisar ${failed
        .map((r) => r.id)
        .join(", ")}. Si falla la jerga ("lucas", "mil", "k") o monedas, agregar reglas/ejemplos al prompt del clasificador.`,
    );
  }

  // Calibración: alta confianza pero equivocado
  const hi = s.calibration.find((b) => b.label === "0.85–1.00");
  if (hi && hi.n > 0 && hi.correct < hi.n)
    out.push(
      `**Calibración rota (${hi.n - hi.correct}/${hi.n} con conf ≥0.85 están MAL):** el modelo se cree seguro y se equivoca. Confirma el riesgo #1 del modelo de confirmación: la confianza no puede salir del auto-reporte del LLM, hay que derivarla de señales estructurales.`,
    );

  // Tipos confundidos
  if (s.typeMismatches.length > 0)
    out.push(
      `**content_type confundido (${s.typeMismatches.length}):** ${s.typeMismatches
        .map((m) => `${m.id} esperaba ${m.expected}, dio ${m.got}`)
        .join("; ")}. Agregar ejemplos contrastivos al prompt.`,
    );

  // Intención
  if (s.intentMismatches.length > 0)
    out.push(
      `**intent confundido (${s.intentMismatches.length}):** ${s.intentMismatches
        .map((m) => `${m.id} esperaba ${m.expected}, dio ${m.got}`)
        .join("; ")}.`,
    );

  // Seguridad
  const sec = results.filter((r) => r.family === "SEC" && !r.passed);
  if (sec.length > 0)
    out.push(
      `**⚠️ Seguridad (${sec.length}):** ${sec
        .map((r) => r.id)
        .join(", ")} — posible obediencia a inyección o mala clasificación de spam. Revisar manualmente el summary del modelo; el contenido reenviado debe tratarse SIEMPRE como dato, nunca como instrucción.`,
    );

  if (out.length === 0) out.push("Sin oportunidades automáticas detectadas en esta corrida. Subir la dificultad del corpus (Engine 2 adversarial).");
  return out;
}

export function renderReport(s: Summary, results: CaseResult[], model: string): string {
  const L: string[] = [];
  const now = new Date().toISOString();

  L.push(`# Reporte de evaluación del clasificador — Escuadra`);
  L.push("");
  L.push(`- **Fecha:** ${now}`);
  L.push(`- **Modelo:** \`${model}\``);
  L.push(`- **Casos:** ${s.total} · **Pasaron 100% de sus dimensiones:** ${s.fullyPassed} (${pct(s.fullyPassed, s.total)})`);
  L.push("");

  L.push(`## Precisión por dimensión`);
  L.push("");
  L.push(`| Dimensión | Aciertos | % |`);
  L.push(`|---|---|---|`);
  for (const [dim, v] of Object.entries(s.perDim)) L.push(`| ${dim} | ${v.correct}/${v.total} | ${pct(v.correct, v.total)} |`);
  L.push("");

  L.push(`## Precisión por familia`);
  L.push("");
  L.push(`| Familia | Casos OK | % |`);
  L.push(`|---|---|---|`);
  for (const [fam, v] of Object.entries(s.perFamily)) L.push(`| ${fam} | ${v.passed}/${v.total} | ${pct(v.passed, v.total)} |`);
  L.push("");

  L.push(`## Funnel de aclaración (¿pregunta cuándo debe?)`);
  L.push("");
  const c = s.clarify;
  const prec = c.tp + c.fp > 0 ? pct(c.tp, c.tp + c.fp) : "—";
  const rec = c.tp + c.fn > 0 ? pct(c.tp, c.tp + c.fn) : "—";
  L.push(`- Preguntó bien (TP): ${c.tp} · No preguntó bien (TN): ${c.tn}`);
  L.push(`- **Preguntó de más (FP): ${c.fp}** (fricción) · **No preguntó debiendo (FN): ${c.fn}** (error silencioso)`);
  L.push(`- Precisión: ${prec} · Recall: ${rec}`);
  L.push("");

  L.push(`## Calibración (confianza reportada vs. acierto real de obra)`);
  L.push("");
  L.push(`| Bucket de confianza | n | Acierto real |`);
  L.push(`|---|---|---|`);
  for (const b of s.calibration) L.push(`| ${b.label} | ${b.n} | ${pct(b.correct, b.n)} |`);
  L.push(`> Si el acierto real es mucho menor que el bucket, el modelo está sobre-confiado (riesgo central del producto).`);
  L.push("");

  const fails = results.filter((r) => !r.passed);
  L.push(`## Fallos (${fails.length})`);
  L.push("");
  if (fails.length === 0) L.push(`Ninguno 🎉`);
  for (const r of fails) {
    const bad = r.dims.filter((d) => !d.pass).map((d) => `${d.dim}: esperaba \`${d.expected}\`, dio \`${d.got}\``);
    L.push(`### ❌ ${r.id} (${r.family}) — ${r.note}`);
    L.push(`- **Mensaje:** ${r.input}`);
    L.push(`- **Falló:** ${bad.join(" · ")}`);
    L.push(`- **summary del modelo:** "${r.gotSummary}" · conf obra ${r.gotConf.toFixed(2)}`);
    L.push("");
  }

  L.push(`## Oportunidades de mejora`);
  L.push("");
  for (const o of opportunities(s, results)) L.push(`- ${o}`);
  L.push("");

  L.push(`## Detalle completo`);
  L.push("");
  L.push(`| Caso | Fam | OK | intent | obra | conf | clarify | tipo |`);
  L.push(`|---|---|---|---|---|---|---|---|`);
  for (const r of results)
    L.push(
      `| ${r.id} | ${r.family} | ${r.passed ? "✅" : "❌"} | ${r.gotIntent} | ${r.gotObra ?? "—"} | ${r.gotConf.toFixed(2)} | ${r.gotClarify ? "sí" : "no"} | ${r.gotType ?? "—"} |`,
    );
  L.push("");

  return L.join("\n");
}
