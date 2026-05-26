// Modelo de uso de Escuadra — convierte "arquitectos / días" en volumen de mensajes
// y costo de API. Los números base salen de docs/descripcion-producto.md
// (estudios 1-15 personas, 3-30 obras, cientos de fotos/proyecto, backlog dumps de 60
// ítems en 3 min — SQ-06). AJUSTAR con datos reales de entrevistas.

export const USAGE = {
  /** Reenvíos por arquitecto activo en un día típico. Cada foto cuenta 1. */
  msgsPerArchitectDay: 30,
  /** Sesiones (ráfagas) por día. */
  sessionsPerDay: 4,
  /** Obras distintas tocadas en un día. */
  obrasTouchedPerDay: 3,
  /** Fracción de mensajes genuinamente ambiguos (deberían disparar aclaración). */
  ambiguityRate: 0.15,
  /** Fracción de mensajes que son audio (→ pasan por Whisper). */
  audioFraction: 0.15,
  /** Días hábiles por mes. */
  workdaysPerMonth: 22,
};

// Tarifas APROXIMADAS (USD). Ajustar con las reales de Anthropic/OpenAI.
export const PRICING = {
  /** 1 call de clasificación (Sonnet, system cacheado + mensaje corto). */
  classifyCallUsd: 0.004,
  /** 1 transcripción de audio (Whisper). */
  whisperPerAudioUsd: 0.006,
};

export type Scale = { architects: number; days: number };

export function projectScale({ architects, days }: Scale) {
  const messages = Math.round(architects * days * USAGE.msgsPerArchitectDay);
  const audioCalls = Math.round(messages * USAGE.audioFraction);
  const classifyCalls = messages; // 1 por mensaje
  const estUsd = classifyCalls * PRICING.classifyCallUsd + audioCalls * PRICING.whisperPerAudioUsd;
  return { messages, classifyCalls, audioCalls, estUsd };
}

/** Equivalencia inversa: dado un nº de mensajes, cuántos arquitecto-días representa. */
export function messagesToArchitectDays(messages: number): number {
  return messages / USAGE.msgsPerArchitectDay;
}

export const SCALE_PRESETS: Record<string, Scale> = {
  "arquitecto-dia": { architects: 1, days: 1 },
  "arquitecto-semana": { architects: 1, days: 5 },
  "estudio-semana": { architects: 3, days: 5 }, // estudio chico = ~3 arquitectos
  "estudio-mes": { architects: 3, days: 22 },
  "10-estudios-mes": { architects: 30, days: 22 },
};
