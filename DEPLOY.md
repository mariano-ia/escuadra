# Deploy de Escuadra

El código está completo y en `mariano-ia/escuadra`. Estos pasos (requieren tus cuentas) lo ponen en vivo.

## 1. Conectar el repo a Vercel
- vercel.com → **Add New… → Project** → importá `mariano-ia/escuadra`.
- Framework: **Next.js** (autodetectado). **Root Directory: `./`** (el repo ES la app).
- **No deployes todavía**: primero cargá las env vars (paso 2).

## 2. Variables de entorno (Project Settings → Environment Variables)
Copiá los valores desde tu `.env.local`:

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (de .env.local) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (de .env.local) |
| `SUPABASE_SERVICE_ROLE_KEY` | (de .env.local) |
| `SUPABASE_PROJECT_REF` | `ehvsfintmkoclqehqwdv` |
| `ANTHROPIC_API_KEY` | (de .env.local) |
| `OPENAI_API_KEY` | (de .env.local) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` | (de .env.local) |
| `CRON_SECRET` / `ENCRYPTION_KEY` | (de .env.local — generados por el agente) |
| `ADMIN_EMAILS` | `marianonoceti@gmail.com` |
| `TZ` | `America/Argentina/Buenos_Aires` |
| `APP_BASE_URL` | ⚠️ Ver paso 3 |

## 3. Primer deploy → setear `APP_BASE_URL`
- Deployá. Vercel te da una URL (`https://escuadra-xxx.vercel.app`).
- Seteá `APP_BASE_URL` = esa URL exacta y **Redeploy** (la firma de Twilio y los links de informe la usan).

## 4. Webhook de Twilio
- Twilio Console → Messaging → Try it out → **WhatsApp Sandbox → Sandbox settings**.
- "When a message comes in": `https://<APP_BASE_URL>/api/twilio/inbound` — método **POST** → Guardar.

## 5. Crons
- `vercel.json` ya define `drain` (*/2 min) y `alerts` (hourly). Vercel los corre solo (requiere plan con crons).
- Vercel inyecta `Authorization: Bearer $CRON_SECRET`; las rutas lo validan.

## 6. Prueba end-to-end
1. Web: **signup** → `/conectar` → **Generar mi código** (ARQ-XXXX).
2. WhatsApp: unite al sandbox (`join <código-sandbox>` al número) → mandá el **ARQ-XXXX**.
3. Mandá "obra Casa Test" (la creás antes en el panel) y después una foto.
4. Panel → la foto aparece en la obra; **Generar informe** → abrí el link `/r/...`.

## 7. Google Drive (V1, opt-in — requiere setup OAuth)
- console.cloud.google.com → OAuth client (Web). Redirect: `https://<APP_BASE_URL>/api/oauth/gdrive/callback`.
- Seteá `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` / `GOOGLE_OAUTH_REDIRECT_URI`.
- La integración de sync (subir fotos a Drive por obra) se completa en la próxima iteración; el resto del producto funciona sin esto.

## Notas de arquitectura
- Multi-tenant con RLS en todas las tablas; service-role solo server (ingesta/admin), `assertSafeRef` protege el proyecto.
- Procesamiento: webhook fast-ack + `after()` + cron drain de respaldo.
- Para el sender de WhatsApp **productivo** (no sandbox) se necesita aprobación de Meta (semanas).
