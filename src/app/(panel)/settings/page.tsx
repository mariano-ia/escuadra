import { generateCodeAction } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const sandbox = (process.env.TWILIO_WHATSAPP_FROM ?? "").replace(/^whatsapp:/, "");

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl mb-8">Configuración</h1>

      <section>
        <h2 className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-4">
          Conectar WhatsApp
        </h2>
        <p className="text-grey text-sm mb-6">
          Vinculá tu teléfono una vez y reenviá lo importante de tus obras. Escuadra lo ordena solo.
        </p>

        <ol className="space-y-5">
          <li className="border border-rule p-5">
            <p className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft mb-2">
              Paso 1 · Unite al sandbox
            </p>
            <p className="text-sm text-grey">
              Desde tu WhatsApp, enviá <span className="font-display text-ink">join &lt;código-sandbox&gt;</span>{" "}
              al número <span className="font-display text-ink">{sandbox || "(configurar Twilio)"}</span> (una sola vez).
            </p>
          </li>
          <li className="border border-rule p-5">
            <p className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft mb-2">
              Paso 2 · Mandá tu código de vinculación
            </p>
            {code ? (
              <div className="mt-1">
                <p className="font-display text-3xl tracking-[0.12em] text-ink">{code}</p>
                <p className="text-sm text-grey mt-2">Enviá ese código por WhatsApp al mismo número. Vence en 15 minutos.</p>
              </div>
            ) : (
              <form action={generateCodeAction}>
                <button className="mt-1 bg-ink text-bg font-display text-sm tracking-wide px-5 py-2.5">
                  Generar mi código
                </button>
              </form>
            )}
          </li>
        </ol>

        {code && (
          <form action={generateCodeAction} className="mt-5">
            <button className="font-display text-xs tracking-[0.16em] uppercase text-grey-soft hover:text-ink">
              Generar otro código
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
