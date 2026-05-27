import Link from "next/link";

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4 py-4 border-b border-rule-soft last:border-0">
      <span className={`shrink-0 w-7 h-7 grid place-items-center font-display text-xs border ${done ? "bg-ink text-bg border-ink" : "border-rule text-grey-soft"}`}>
        {done ? "✓" : n}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-display text-sm tracking-wide ${done ? "text-grey-soft line-through" : "text-ink"}`}>{title}</p>
        {!done && <div className="mt-2 text-sm text-grey">{children}</div>}
      </div>
    </li>
  );
}

/** Checklist de activación. Se muestra hasta completar los 3 pasos; ataca el churn de la semana 1. */
export function OnboardingChecklist({ whatsappLinked, hasObras, hasEntries }: { whatsappLinked: boolean; hasObras: boolean; hasEntries: boolean }) {
  if (whatsappLinked && hasObras && hasEntries) return null;
  return (
    <section className="border border-ink p-6 mb-8 bg-paper/50">
      <p className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-1">Primeros pasos</p>
      <h2 className="text-xl mb-3">Dejá tu estudio listo en 3 pasos</h2>
      <ol>
        <Step n={1} done={whatsappLinked} title="Conectá tu WhatsApp">
          <Link href="/conectar" className="bg-ink text-bg font-display text-xs tracking-[0.12em] uppercase px-4 py-2 inline-block">
            Conectar WhatsApp
          </Link>
        </Step>
        <Step n={2} done={hasObras} title="Creá tu primera obra">
          <Link href="/obras/nueva" className="border border-ink font-display text-xs tracking-[0.12em] uppercase px-4 py-2 inline-block hover:bg-ink hover:text-bg transition-colors">
            Crear obra
          </Link>
        </Step>
        <Step n={3} done={hasEntries} title="Reenviá algo por WhatsApp">
          Mandá una foto, un audio o una cotización al número de Escuadra — aparece acá, ordenado solo.
        </Step>
      </ol>
    </section>
  );
}
