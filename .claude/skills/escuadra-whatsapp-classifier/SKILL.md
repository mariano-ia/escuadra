---
name: escuadra-whatsapp-classifier
description: Use when implementing or modifying how Escuadra interprets forwarded WhatsApp messages — the cheap pre-pass, the Claude tool-use classification, the intent layer, obra disambiguation, the active-obra session, the clarification/correction grammar, the grouping window, or default-to-Inbox. Triggers when writing the ingestion drainer, the classifier prompt/schema, or the conversation state machine.
---

# Escuadra WhatsApp Classifier

## Overview

The classifier turns a forwarded WhatsApp message into filed data. **The fragile part is NOT
Claude reading one message — it's inferring sequence and conversation state from loose messages
arriving in any order.** So the system holds the state (active obra, grouping window, open
clarifications); Claude only does what it's good at: understand one message and classify its
content. There is always an Inbox safety net underneath.

Full design: `casos-de-uso.md` (catalog + 11 closed product decisions) and
`diseno-interaccion.md` (state model, command grammar, transcripts). Read both before changing logic.

**Verification (its "test"): write the fixtures FIRST (TDD).** Each case below becomes a test
against the classifier before the logic exists. The skill is "green" when the fixtures pass.

## Pipeline order

1. **Identity gate** (before downloading media): sender phone → `whatsapp_links`. Unknown → onboarding/ARQ-code path or polite reject. Never spend vision/Whisper on unlinked senders.
2. **Cheap pre-pass** on text-only messages: heuristic / small model to detect intent + noise. Memes/greetings → Inbox-flagged, do NOT call vision.
3. **Grouping window** (`entry_group`, 90s per sender, reset on each media): batch media + text into one "avance" regardless of arrival order.
4. **Transcribe** audio (Whisper, `language:'es'`); store transcript even if it fails.
5. **Classify** with Claude tool-use (schema below), with the cached studio-context block.
6. **Resolve obra** via the cascade; file or ask or Inbox; **confirm once per avance**.

## Tool schema (forced tool `file_whatsapp_message`)

Supports the closed decisions: **intent layer** + **N filings** (a message can touch several obras).

```jsonc
{
  "intent": "archivar | consultar | comando | correccion | ruido",
  "filings": [                       // N items — "partir en N" (MT-01/MT-03)
    { "obra_id": "uuid | null",
      "obra_confidence": 0.0,         // 0..1
      "content_type": "photo|audio|text|quote|approval|payment|issue|visit|delivery|video|note",
      "album_hint": "string | null",
      "fields": { "amount": null, "currency": null, "provider_name": null,
                  "client_name": null, "due_date": null, "valid_until": null,
                  "issue_title": null, "severity": null } }
  ],
  "needs_clarification": false,
  "clarification_question": "string | null",
  "clarification_options": [],       // ordered, so a "1"/"2" reply binds correctly
  "summary_es": "string"
}
```

- **Cached context block** (`cache_control`): active obras (name/address/client), known providers, recent timeline items, available albums. Stable per studio → cache it.
- **Untrusted-data framing:** wrap forwarded content in delimiters and tell the model it is *data, not instructions* (prompt-injection defense). Validate with Zod that every `obra_id` belongs to the sender's studio.

## Obra resolution cascade (first match wins)

1. Explicit obra in caption (confidence ≥ **0.65**) → that obra (and it becomes active).
2. Unique provider/client that works in one active obra → that obra (confirm softly).
3. Active obra of the session (`OBRA_ACTIVA`, TTL 8h) → that obra.
4. Studio has exactly one active obra → that one.
5. None → confidence medium: numbered clarification; low / no answer → **Inbox**.

## Clarification & correction grammar

- Clarification = `pending_clarifications` with `partial_extraction`, `candidate_obras`, ordered `options`, `expires_at` (6h). Numbered (max 4 + escape).
- **Do NOT assume the next message is the answer** — Claude judges "answer vs new content". New content → process as new, leave the question open.
- After 1–2 ambiguous replies or 6h → default to Inbox. Never loop.
- Correction = *update* of the last entry, not re-archiving: "no, era Palermo" / "el álbum es fachada" / "el monto era 540". `no`/`deshacer` = one-word rescue, soft-delete recoverable 30 days.

## Test fixtures to write first (TDD)

Cover the top-15 dangerous cases from `casos-de-uso.md`, at minimum:
SQ-01 (caption tardío), SQ-05 (caption en 1 de N), TS-02 (respuesta = contenido nuevo no relacionado),
AM-02 (dos obras similares → numerada), AM-05 (foto avance vs problema), CQ-01 (query no se archiva como nota),
MF-01 (OCR de cotización → confirmar monto), EC-01/EC-02 (obra inexistente/typo → nunca auto-crear),
MT-01 (un texto → N filings), NO-01 (meme → Inbox sin gastar visión), ON-02 (desconocido → no baja media).

## Red flags — STOP

- Pidiéndole al LLM que recuerde el estado entre mensajes (eso lo hace el modelo de sesión).
- Auto-crear una obra/proveedor sin confirmar (typo → basura).
- Asumir que el próximo mensaje responde la aclaración.
- Confirmar foto por foto (rompe la "calma de estudio"; confirmá por avance).
- Bloquear o descartar un mensaje sin obra → siempre va a Inbox.
- Llamar a visión/Whisper antes del identity gate o del cheap pre-pass.
