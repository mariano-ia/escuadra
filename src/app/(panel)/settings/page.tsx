import { getActiveStudio } from "@/lib/auth/session";
import { createServerClient } from "@/lib/db/supabase";
import { generateCodeAction, updateNameAction } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; saved?: string }>;
}) {
  const { code, saved } = await searchParams;
  const ctx = await getActiveStudio();
  const sb = await createServerClient();
  const { data: prof } = ctx
    ? await sb.from("profiles").select("full_name").eq("id", ctx.user.id).maybeSingle()
    : { data: null };
  const sandbox = (process.env.TWILIO_WHATSAPP_FROM ?? "").replace(/^whatsapp:/, "");

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl mb-8">Configuración</h1>

      {/* Tu nombre */}
      <section className="mb-12">
        <h2 className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-3">Tu nombre</h2>
        <p className="text-grey text-sm mb-4">Así te saluda Escuadra y figura en la atribución de cada registro.</p>
        <form action={updateNameAction} className="flex items-end gap-3">
          <label className="flex-1">
            <input
              name="full_name"
              defaultValue={prof?.full_name ?? ""}
              placeholder="Tu nombre"
              className="w-full border-b border-ink bg-transparent py-2 outline-none focus:border-grey"
            />
          </label>
          <button className="bg-ink text-bg font-display text-sm tracking-wide px-5 py-2.5">Guardar</button>
        </form>
        {saved && <p className="text-xs text-grey-soft mt-2">Guardado ✓</p>}
      </section>

      {/* Conectar WhatsApp */}
      <section>
        <h2 className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-3">Conectar WhatsApp</h2>
        <p className="text-grey text-sm mb-6">
          Vinculá tu teléfono una vez y reenviá lo importante de tus obras. Escuadra lo ordena solo.
        </p>
        <ol className="space-y-5">
          <li className="border border-rule p-5">
            <p className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft mb-2">Paso 1 · Unite al sandbox</p>
            <p className="text-sm text-grey">
              Desde tu WhatsApp, enviá <span className="font-display text-ink">join &lt;código-sandbox&gt;</span> al número{" "}
              <span className="font-display text-ink">{sandbox || "(configurar Twilio)"}</span> (una sola vez).
            </p>
          </li>
          <li className="border border-rule p-5">
            <p className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft mb-2">Paso 2 · Mandá tu código de vinculación</p>
            {code ? (
              <div className="mt-1">
                <p className="font-display text-3xl tracking-[0.12em] text-ink">{code}</p>
                <p className="text-sm text-grey mt-2">Enviá ese código por WhatsApp al mismo número. Vence en 15 minutos.</p>
              </div>
            ) : (
              <form action={generateCodeAction}>
                <button className="mt-1 bg-ink text-bg font-display text-sm tracking-wide px-5 py-2.5">Generar mi código</button>
              </form>
            )}
          </li>
        </ol>
      </section>
    </div>
  );
}
