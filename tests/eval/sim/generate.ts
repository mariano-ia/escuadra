import Anthropic from "@anthropic-ai/sdk";
import { CLASSIFIER_MODEL, type ContentType } from "@/lib/claude/classify";
import type { EvalCase } from "../corpus";
import { USAGE } from "./usage-model";
import type { Persona } from "./personas";

// El "arquitecto robot" inventa un día de mensajes realistas, cada uno con la
// verdad de lo que QUISO hacer. Después el clasificador (sin ver esa verdad) los
// procesa y comparamos. Es la simulación de uso sin usuarios reales.

const KNOWN_OBRAS: Record<FixtureKey, string[]> = {
  "tres-obras": ["obra-belgrano", "obra-palermo", "obra-nunez"],
};
type FixtureKey = "tres-obras";

const CONTENT_TYPES: ContentType[] = [
  "photo", "audio", "text", "quote", "approval", "payment", "issue", "visit", "delivery", "note", "video",
];

const TOOL: Anthropic.Tool = {
  name: "emit_day",
  description: "Devuelve un día de mensajes que el arquitecto reenviaría a su asistente, con la verdad de cada uno.",
  input_schema: {
    type: "object",
    properties: {
      messages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: ["string", "null"], description: "Texto del mensaje (o null si es solo audio)." },
            transcript: { type: ["string", "null"], description: "Transcripción si es una nota de voz, si no null." },
            family: { type: "string", enum: ["AM", "MF", "CT", "INT", "AUD", "SEC", "EC"] },
            note: { type: "string", description: "Qué prueba este caso (una línea)." },
            intent: { type: "string", enum: ["archivar", "consultar", "comando", "correccion", "ruido"] },
            obra_id: { type: ["string", "null"], description: "obra-belgrano | obra-palermo | obra-nunez | null si es genuinamente ambiguo o no es de obra." },
            content_type: { type: "string", enum: CONTENT_TYPES },
            amount: { type: ["number", "null"] },
            currency: { type: ["string", "null"] },
            provider: { type: ["string", "null"] },
            should_clarify: { type: "boolean", description: "true si Escuadra DEBERÍA preguntar de qué obra es antes de guardar." },
          },
          required: ["text", "transcript", "family", "note", "intent", "obra_id", "content_type", "should_clarify"],
        },
      },
    },
    required: ["messages"],
  },
};

type GenItem = {
  text: string | null; transcript: string | null;
  family: EvalCase["family"]; note: string;
  intent: EvalCase["expect"]["intent"]; obra_id: string | null;
  content_type: ContentType; amount: number | null; currency: string | null;
  provider: string | null; should_clarify: boolean;
};

export async function generateDay(persona: Persona, n: number): Promise<EvalCase[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const fixture = persona.fixture as FixtureKey;
  const known = KNOWN_OBRAS[fixture] ?? [];

  const system = `Sos un GENERADOR de casos de prueba. Personificás a este arquitecto y producís los mensajes que reenviaría a su asistente de obra (Escuadra) en un día real, en es-AR.

Perfil: ${persona.description}

Obras del estudio (usá SOLO estos ids):
- Belgrano Cabildo → obra-belgrano
- Palermo Soho → obra-palermo
- Núñez Libertador → obra-nunez

REGLAS DEL ESQUEMA (importante, no las confundas):
- "intent" es SOLO qué quiere hacer el arquitecto, una de: archivar (guardar algo) · consultar (hace una pregunta) · comando (da una orden: "obra Belgrano", "armame el informe") · correccion ("no, era Palermo") · ruido (saludo, meme, audio personal mandado por error). CASI TODO lo que se reenvía para guardar es intent=archivar.
- "content_type" es QUÉ TIPO de cosa es: photo · audio (nota de voz, usá el campo transcript) · quote (cotización con monto) · payment (pago hecho) · approval (aprobación del cliente) · issue (problema/reclamo) · visit (visita agendada) · delivery (entrega de materiales) · note (texto suelto sin categoría) · video. Una aprobación es intent=archivar + content_type=approval, NO intent=approval.
- Para texto suelto sin categoría usá content_type=note (nunca "text").

Generá ${n} mensajes VARIADOS y REALISTAS, como una jornada de obra:
- TODO mensaje debe tener texto o transcript (no generes mensajes solo-foto sin palabras: el test todavía no manda imágenes).
- La mayoría claros (obra nombrada o evidente) → should_clarify=false.
- ~${Math.round(USAGE.ambiguityRate * 100)}% genuinamente ambiguos (sin pista de obra y 2+ candidatas) → obra_id=null, should_clarify=true.
- Algunos con montos en formato AR ("$480.000"), jerga ("480 lucas"), o USD → content_type=quote o payment.
- Al menos un audio (transcript), una cotización con proveedor, un pago, una aprobación, un problema, una visita, una entrega.
- Algún ruido (saludo, meme reenviado, audio personal) → intent=ruido.
- Ocasional mezcla de 2 obras en un mensaje → si pide decidir, intent=consultar y obra_id=null.
Completá la VERDAD honestamente (lo que el arquitecto realmente quiso). Si es ambiguo, should_clarify=true y obra_id=null.`;

  const msg = await client.messages.create({
    model: CLASSIFIER_MODEL,
    max_tokens: 4096,
    system,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "emit_day" },
    messages: [{ role: "user", content: `Generá ${n} mensajes del día de este arquitecto.` }],
  });

  const block = msg.content.find((b) => b.type === "tool_use") as Anthropic.ToolUseBlock | undefined;
  if (!block) throw new Error("generador: sin tool_use");
  const items = (block.input as { messages: GenItem[] }).messages ?? [];

  return items.map((it, i): EvalCase => {
    const obraId = it.obra_id && known.includes(it.obra_id) ? it.obra_id : null;
    const expect: EvalCase["expect"] = {
      intent: it.intent,
      obraId,
      shouldClarify: it.should_clarify,
      contentType: it.content_type,
    };
    if (it.amount != null) {
      expect.amount = it.amount;
      if (it.currency) expect.currency = it.currency;
    }
    if (it.provider) expect.provider = it.provider;
    return {
      id: `SIM-${persona.id}-${String(i + 1).padStart(2, "0")}`,
      family: it.family,
      note: it.note,
      fixture: persona.fixture,
      input: { text: it.text ?? null, transcript: it.transcript ?? null },
      expect,
    };
  });
}
