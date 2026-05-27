import { getActiveStudio } from "@/lib/auth/session";
import { createServerClient } from "@/lib/db/supabase";
import { signedUrl } from "@/lib/storage";
import { driveConfigured, getConnection, pendingDriveCount } from "@/lib/cloud/gdrive";
import { generateCodeAction, updateNameAction, updateStudioAction, syncDriveAction } from "./actions";
import { LogoUpload } from "./logo-upload";

function Section({ title, children, soon }: { title: string; children?: React.ReactNode; soon?: boolean }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft">{title}</h2>
        {soon && (
          <span className="font-display text-[0.55rem] tracking-[0.16em] uppercase text-grey-light border border-rule px-2 py-0.5">
            Próximamente
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; saved?: string; drive?: string; n?: string; rem?: string }>;
}) {
  const { code, saved, drive, n, rem } = await searchParams;
  const ctx = await getActiveStudio();
  const sb = await createServerClient();
  const { data: prof } = ctx
    ? await sb.from("profiles").select("full_name").eq("id", ctx.user.id).maybeSingle()
    : { data: null };
  const { data: links } = await sb
    .from("whatsapp_links")
    .select("phone_e164, status, verified_at")
    .eq("status", "active");
  const logoPath = ctx?.studio.logo_storage_path ?? null;
  const logoUrl = logoPath ? await signedUrl(logoPath, 3600).catch(() => null) : null;
  const sandbox = (process.env.TWILIO_WHATSAPP_FROM ?? "").replace(/^whatsapp:/, "");

  const driveOn = driveConfigured();
  const driveConn = driveOn && ctx ? await getConnection(ctx.studio.id).catch(() => null) : null;
  const driveConnected = !!driveConn?.refresh_token_enc;
  const drivePending = driveConnected && ctx ? await pendingDriveCount(ctx.studio.id).catch(() => 0) : 0;

  let driveBanner: string | null = null;
  if (drive === "synced") driveBanner = `Listo — subí ${n ?? 0} foto${n === "1" ? "" : "s"} a tu Drive.${Number(rem) > 0 ? ` Quedan ${rem}, tocá de nuevo para seguir.` : " Quedó todo al día."}`;
  else if (drive === "connected") driveBanner = "Google Drive conectado ✓ — las fotos se respaldan por obra.";
  else if (drive === "error") driveBanner = "No pudimos conectar Google Drive. Probá de nuevo.";
  else if (drive === "expired") driveBanner = "El enlace de conexión venció. Probá de nuevo.";

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl mb-8">Configuración</h1>
      {saved && <p className="text-xs text-grey-soft mb-6">Guardado ✓</p>}
      {driveBanner && <p className="text-xs text-grey-soft mb-6">{driveBanner}</p>}

      <Section title="Tu nombre">
        <p className="text-grey text-sm mb-4">Así te saluda Escuadra y figura en la atribución de cada registro.</p>
        <form action={updateNameAction} className="flex items-end gap-3">
          <input name="full_name" defaultValue={prof?.full_name ?? ""} placeholder="Tu nombre"
            className="flex-1 border-b border-ink bg-transparent py-2 outline-none focus:border-grey" />
          <button className="bg-ink text-bg font-display text-sm tracking-wide px-5 py-2.5">Guardar</button>
        </form>
      </Section>

      <Section title="Datos del estudio">
        <form action={updateStudioAction} className="flex items-end gap-3 mb-5">
          <label className="flex-1">
            <span className="text-xs text-grey-soft">Nombre del estudio</span>
            <input name="studio_name" defaultValue={ctx?.studio.name ?? ""}
              className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none focus:border-grey" />
          </label>
          <button className="bg-ink text-bg font-display text-sm tracking-wide px-5 py-2.5">Guardar</button>
        </form>
        <p className="text-xs text-grey-soft mb-2">Logo (aparece en los informes que mandás al cliente)</p>
        <LogoUpload logoUrl={logoUrl} />
      </Section>

      <Section title="Conectar WhatsApp">
        <p className="text-grey text-sm mb-4">Vinculá tu teléfono y reenviá lo importante de tus obras.</p>
        {links && links.length > 0 && (
          <ul className="mb-4 border border-rule divide-y divide-rule-soft">
            {links.map((l) => (
              <li key={l.phone_e164} className="px-4 py-2.5 flex items-center justify-between text-sm">
                <span className="text-ink">{l.phone_e164}</span>
                <span className="font-display text-[0.6rem] tracking-[0.14em] uppercase text-grey-soft">vinculado</span>
              </li>
            ))}
          </ul>
        )}
        <div className="border border-rule p-5">
          <p className="text-sm text-grey mb-3">
            1) Unite al sandbox enviando <span className="font-display text-ink">join &lt;código&gt;</span> a{" "}
            <span className="font-display text-ink">{sandbox || "(Twilio)"}</span>. 2) Mandá tu código:
          </p>
          {code ? (
            <p className="font-display text-3xl tracking-[0.12em] text-ink">{code}</p>
          ) : (
            <form action={generateCodeAction}>
              <button className="bg-ink text-bg font-display text-sm tracking-wide px-5 py-2.5">Generar mi código</button>
            </form>
          )}
        </div>
      </Section>

      <Section title="Equipo" soon>
        <p className="text-grey text-sm">Invitá a tus socios y asistentes para compartir las obras del estudio.</p>
      </Section>

      <Section title="Integraciones" soon={!driveOn}>
        <div className="space-y-2">
          <div className="border border-rule px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-ink">Google Drive — backup de fotos por obra</span>
              {!driveOn ? (
                <span className="font-display text-[0.55rem] tracking-[0.16em] uppercase text-grey-light">Coming soon</span>
              ) : driveConnected ? (
                <span className="font-display text-[0.6rem] tracking-[0.14em] uppercase text-grey-soft whitespace-nowrap">conectado ✓</span>
              ) : (
                <a href="/api/oauth/gdrive" className="bg-ink text-bg font-display text-xs tracking-wide px-4 py-2 whitespace-nowrap">
                  Conectar
                </a>
              )}
            </div>
            {driveConnected && (
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {drivePending > 0 ? (
                  <form action={syncDriveAction}>
                    <button className="bg-ink text-bg font-display text-xs tracking-wide px-4 py-2">
                      Sincronizar {drivePending} foto{drivePending === 1 ? "" : "s"}
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-grey-soft">Todo sincronizado ✓</span>
                )}
                <a href="/api/oauth/gdrive" className="border border-rule font-display text-xs tracking-wide px-4 py-2 hover:border-ink transition-colors">
                  Cambiar cuenta
                </a>
              </div>
            )}
          </div>
          <div className="border border-rule px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-ink">Dropbox</span>
            <span className="font-display text-[0.55rem] tracking-[0.16em] uppercase text-grey-light">Coming soon</span>
          </div>
        </div>
      </Section>

      <Section title="Plan y facturación" soon>
        <p className="text-grey text-sm">Tu plan, uso y facturación.</p>
      </Section>

      <Section title="Datos y privacidad">
        <p className="text-grey text-sm mb-3">Nuestros documentos legales:</p>
        <div className="flex flex-wrap gap-2">
          <a href="/terminos" target="_blank" rel="noreferrer"
            className="border border-rule font-display text-xs tracking-wide px-4 py-2 hover:border-ink transition-colors">
            Términos y condiciones
          </a>
          <a href="/privacidad" target="_blank" rel="noreferrer"
            className="border border-rule font-display text-xs tracking-wide px-4 py-2 hover:border-ink transition-colors">
            Política de privacidad
          </a>
        </div>
      </Section>
    </div>
  );
}
