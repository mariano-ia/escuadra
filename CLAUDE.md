# Escuadra — guía para agentes

Asistente de WhatsApp para estudios de arquitectura. Multi-tenant, alta seguridad, producto vendible.

## Antes de tocar nada, leé
- `docs/descripcion-producto.md` — qué es y para quién.
- `docs/casos-de-uso.md` — ~70 casos de uso (12 familias, top-15 de riesgo).
- `docs/diseno-interaccion.md` — modelo de estados, comandos, transcripts.
- `docs/modelo-de-confirmacion.md` — **NÚCLEO**: cuándo preguntar / re-confirmar / archivar / Inbox.
- `docs/aprendizaje-y-auditoria.md` — confianza estructural, aprendizaje, auditoría (mayormente fast-follow).

## Skills del proyecto (`.claude/skills/`)
`escuadra-visual-system` · `escuadra-whatsapp-classifier` · `escuadra-tenant-isolation` · `escuadra-compliance`.
Invocalas según la tarea (UI, clasificador, datos/RLS, datos personales).

## Reglas duras
- **Multi-tenant:** RLS en TODAS las tablas; service-role solo en server (ingesta/admin); lecturas del panel con cliente RLS-enforced; repositorio que exige `studioId`. Ver skill `escuadra-tenant-isolation`.
- **Guarda Supabase:** `assertSafeRef()` antes de toda escritura. NUNCA tocar el proyecto `luutdozbhinfiogugjbv` (prod de otro producto). El de Escuadra es nuevo, en la org "Yacaré".
- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind v4 + Supabase (Postgres+Auth+Storage+RLS) + Anthropic `claude-sonnet-4-6` (tool-use) + OpenAI Whisper + Twilio WhatsApp (1 número, ruteo por remitente).
- **Localización:** es-AR, ARS, TZ `America/Argentina/Buenos_Aires`.
- **WhatsApp:** asistente **siempre reactivo** (nunca abre la conversación) y **siempre acusa recibo** (por avance, no por foto).

## Comandos
- `npm run dev` — desarrollo
- `npm run build` — build de producción
- `npm test` — tests (vitest)
- `npm run lint` — lint

@AGENTS.md
