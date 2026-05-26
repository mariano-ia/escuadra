# Testing simulado de Escuadra

Reemplaza horas de QA manual por evaluación automatizada que **simula uso real** y
encuentra bugs + oportunidades de mejora. La verdad de referencia sale de los docs del
producto (`docs/casos-de-uso.md`, `docs/modelo-de-confirmacion.md`).

## Las 4 capas

| Capa | Qué simula | Estado | Costo |
|---|---|---|---|
| **0 · Lógica determinista** | La cascada de ruteo y el funnel de `processInbound` (qué obra, preguntar/archivar/Inbox), aislada del LLM y la DB | _pendiente_ (requiere extraer la decisión pura de `process.ts`) | gratis |
| **1 · Eval del clasificador** | Corpus etiquetado → `classifyMessage` real → métricas, confusión, calibración | ✅ **acá** | API (centavos/corrida) |
| **2 · Adversarial / "arquitecto sintético"** | Un LLM-persona genera mensajes nuevos y desordenados (typos, jerga, ráfagas, inyección); un LLM-juez califica | _scaffold_ | API (más) |
| **3 · Conversación E2E** | Sesiones multi-turno: obra activa → ráfaga → corrección → aclaración → undo. Toca DB + state machine | _pendiente_ (requiere branch de Supabase, NO prod) | API + DB |

## Capa 1 — cómo correrla

```bash
# Tests GRATIS (calificador + lógica). NO llama a la API. Corre en CI.
npm test

# Eval real contra el clasificador (gasta API). Escribe reporte en reports/.
RUN_EVAL=1 npx vitest run tests/eval/classifier.eval.test.ts

# Corrida chica para probar/estimar (primeros N casos):
RUN_EVAL=1 EVAL_LIMIT=8 npx vitest run tests/eval/classifier.eval.test.ts
```

El reporte (`reports/<timestamp>.md`, git-ignored) trae: precisión por dimensión y
familia, **matriz de confusión del funnel** (¿pregunta cuándo debe?), **tabla de
calibración** (confianza reportada vs. acierto real — el riesgo central del producto),
lista rankeada de fallos con el mensaje y el diff, y **oportunidades de mejora** derivadas.

## Archivos

- `corpus.ts` — casos etiquetados (mensaje + verdad esperada). **Acá se agregan casos nuevos.**
- `fixtures.ts` — contextos de estudio sintéticos (formato de `buildStudioContext`).
- `grade.ts` — calificación por dimensión + agregación (puro, testeado en `grade.test.ts`).
- `report.ts` — armado del markdown + heurística de oportunidades (puro).
- `classifier.eval.test.ts` — runner gateado por `RUN_EVAL`.
- `grade.test.ts` — tests gratis que garantizan que las métricas son confiables.

## Cómo usarlo en el loop de desarrollo

1. Corré el eval → guardá el reporte como baseline.
2. Tocá el prompt del clasificador (`src/lib/claude/classify.ts`).
3. Re-corré → comparás reportes. Es la **suite de regresión del prompt**.
4. Cada bug nuevo que aparezca (sobre todo vía Capa 2) se destila en un caso de `corpus.ts`
   para que no vuelva.

## Limitaciones de la v1 (a cerrar)

- **Sin fotos reales:** los casos de visión usan texto/transcripción. Sumar imágenes de
  fixture para evaluar ruteo por foto y detección `photo` vs `issue`.
- **Funnel con muestra chica:** pocos casos con `shouldClarify` etiquetado → el recall es
  ruidoso. Agregar más casos ambiguos (con y sin media).
- **No mide la obra activa ni la agrupación:** eso es estado (Capa 3), no del clasificador.
