import { parseObraCommand, isBareSaveLeadIn } from "@/lib/ingest/route";

// Ventana de agrupación ("avance"): WhatsApp entrega cada foto como un mensaje aparte.
// En vez de procesar cada uno (y spamear "guardé 1 foto"), esperamos a que la ráfaga del
// remitente se asiente y la archivamos como UN avance con UN acuse cálido.
// Lógica PURA y testeable acá; la orquestación (esperar + cerrar) vive en el webhook.

/** Silencio (ms) tras el último mensaje del remitente antes de cerrar el avance. */
export const GROUPING_WINDOW_MS = 90_000;

/**
 * Texto puro y autónomo que se resuelve AL INSTANTE, sin esperar la ventana:
 * comando de obra ("obra Belgrano") o "guardá esto" sin contenido. Esperar 90s acá
 * se sentiría roto. Cualquier media → siempre va a la ventana (puede venir más).
 */
export function isImmediateText(body: string, numMedia: number): boolean {
  if (numMedia > 0) return false;
  return parseObraCommand(body) !== null || isBareSaveLeadIn(body);
}

/**
 * ¿Soy el mensaje más nuevo del remitente? Si llegó algo después, ESE handler cerrará
 * el avance y este no hace nada (evita procesar la ráfaga dos veces).
 */
export function isLatest(myCreatedAtMs: number, otherCreatedAtMs: number[]): boolean {
  return otherCreatedAtMs.every((t) => t <= myCreatedAtMs);
}

/** ¿La ráfaga ya se asentó? (pasó la ventana desde el último mensaje). Para el cron de respaldo. */
export function isSettled(lastCreatedAtMs: number, nowMs: number, windowMs = GROUPING_WINDOW_MS): boolean {
  return nowMs - lastCreatedAtMs >= windowMs;
}

/** Une los textos/captions de los mensajes de un avance en uno solo para el clasificador. */
export function combineBodies(bodies: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const b of bodies) {
    const t = (b ?? "").trim();
    if (t && !seen.has(t)) {
      seen.add(t);
      parts.push(t);
    }
  }
  return parts.join(" · ");
}
