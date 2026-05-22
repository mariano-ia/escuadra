import "server-only";
import OpenAI from "openai";

/** Transcribe audio con Whisper (es). Devuelve null si falla (no se pierde el audio crudo). */
export async function transcribeAudio(bytes: Buffer, filename = "audio.ogg"): Promise<string | null> {
  try {
    if (bytes.length > 24 * 1024 * 1024) return null; // límite Whisper ~25MB
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const file = await OpenAI.toFile(bytes, filename);
    const res = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "es",
    });
    return res.text?.trim() || null;
  } catch (e) {
    console.error("[whisper] fallo de transcripción", e);
    return null;
  }
}
