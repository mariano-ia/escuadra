import type { Classification } from "@/lib/claude/classify";

// Lógica PURA de ruteo de un mensaje (sin DB, sin red): dada la clasificación del
// LLM + el estado de la sesión, decide a qué obra va, si hay que preguntar y si se
// fija la obra activa. La usa processInbound (producción) y el simulador de tests,
// así ambos comparten exactamente la misma cascada (una sola fuente de verdad).

export type RoutingState = {
  /** Obra activa de la sesión (TTL vigente), o null. */
  activeObra: string | null;
  /** Ids de obras reales del estudio (sin contar el Inbox). */
  realObraIds: string[];
  /** Id de la obra "Inbox"/sin-clasificar, o null. */
  inboxObraId: string | null;
  /** Obra cuyo nombre aparece explícitamente en el texto/transcripción (match server-side). */
  textMatchedObraId?: string | null;
};

export type RoutingDecision = {
  /** "file" = archivar y acusar · "ask" = preguntar de qué obra (y parquear en Inbox). */
  action: "file" | "ask";
  /** Obra donde se archiva (real o Inbox). En "ask" es el Inbox. */
  targetObraId: string | null;
  confident: boolean;
  needsReview: boolean;
  /** Obra a fijar como activa, o null si no corresponde. */
  setsActiveObra: string | null;
};

/** Cascada de resolución de obra (espejo de processInbound). Gana la primera que aplica. */
export function resolveRouting(cls: Classification, state: RoutingState): RoutingDecision {
  const primary = cls.filings?.[0];
  // SEGURIDAD (C5): el obra_id que devuelve el LLM SOLO se confía si pertenece al estudio.
  // Un id alucinado o inválido se descarta y se cae a la cascada (texto → activa → única →
  // preguntar/Inbox). Si se confiara, el insert con ese obra_id falla y el mensaje se perdería
  // en silencio (chat confirma, nada queda archivado).
  const claimed = primary?.obra_id ?? null;
  let targetObraId: string | null = claimed && state.realObraIds.includes(claimed) ? claimed : null;
  let confident = (primary?.obra_confidence ?? 0) >= 0.65 && !!targetObraId;

  // El texto nombra una obra existente (ej. "obra de tincho" → Casa Tincho).
  if (!targetObraId && state.textMatchedObraId) {
    targetObraId = state.textMatchedObraId;
    confident = true;
  }
  // Obra activa de la sesión — GANA sobre needs_clarification (el usuario la fijó a propósito).
  if (!targetObraId && state.activeObra) {
    targetObraId = state.activeObra;
    confident = true;
  }
  // Única obra del estudio.
  if (!targetObraId && state.realObraIds.length === 1) {
    targetObraId = state.realObraIds[0];
    confident = true;
  }

  // Funnel: preguntar (Nivel 1/2) cuando no hay confianza y hay ambigüedad real.
  if (!confident && (cls.needs_clarification || (!targetObraId && state.realObraIds.length > 1))) {
    return {
      action: "ask",
      targetObraId: state.inboxObraId,
      confident: false,
      needsReview: true,
      setsActiveObra: null,
    };
  }

  const obraId = targetObraId ?? state.inboxObraId;
  return {
    action: "file",
    targetObraId: obraId,
    confident,
    needsReview: !confident,
    setsActiveObra: confident && targetObraId ? targetObraId : null,
  };
}

/** Detecta el comando "fijar obra activa" en texto libre (espejo del regex de processInbound). */
export function parseObraCommand(body: string): string | null {
  const m = body.match(/^(?:obra|trabajando en|pasame a|estoy en la? de)\s+(.{2,60})$/i);
  return m ? m[1].trim() : null;
}

/**
 * "Guardá esto" SIN contenido: el usuario pide guardar/mirar algo pero el mensaje no trae
 * ningún dato sustantivo (el adjunto se chequea aparte). Ej: "guardá esto", "che mirá esto que
 * es importante", "te mando algo". → acuse-invitación, no se crea entrada vacía.
 * Conservador: exige un verbo de guardar/mirar/mandar y que, sacando muletillas, no quede nada.
 */
export function isBareSaveLeadIn(body: string): boolean {
  const t = body
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // sacar acentos
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // sacar puntuación/emojis
    .replace(/\s+/g, " ")
    .trim();
  if (!t || t.length > 50) return false; // mensaje largo → seguro tiene contenido
  const SAVE = /\b(guarda|guardame|guardalo|guardala|mira|mirate|fijate|anota|anotame|mando|paso|envio|reenvio|va|van)\b/g;
  if (!SAVE.test(t)) return false;
  const FILLER = /\b(che|dale|porfa|por|favor|importante|urgente|que|es|esto|eso|esta|este|algo|lo|la|el|un|una|cosa|aca|aqui|ya|ahora|ahi|te|me|capo|amigo|gracias)\b/g;
  const rest = t.replace(SAVE, " ").replace(FILLER, " ").replace(/\s+/g, " ").trim();
  return rest.length === 0;
}
