import Link from "next/link";

/** Marca Escuadra (escuadra SVG + wordmark), igual que la nav del panel. */
function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Escuadra — inicio">
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-ink" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 21 21 21 3 4Z" />
        <line x1="7" y1="21" x2="7" y2="18" />
        <line x1="11" y1="21" x2="11" y2="18" />
        <line x1="15" y1="21" x2="15" y2="18" />
      </svg>
      <span className="font-display font-semibold tracking-[0.28em] uppercase text-sm">Escuadra</span>
    </Link>
  );
}

/** Estructura compartida de las páginas legales (privacidad / términos). */
export function LegalShell({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <header className="border-b border-rule">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Wordmark />
          <nav className="flex items-center gap-5 font-display text-[0.62rem] tracking-[0.16em] uppercase text-grey-soft">
            <Link href="/privacidad" className="hover:text-ink transition-colors">Privacidad</Link>
            <Link href="/terminos" className="hover:text-ink transition-colors">Términos</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-14 sm:py-20">
          <p className="font-display text-[0.62rem] tracking-[0.26em] uppercase text-grey-light mb-4">{eyebrow}</p>
          <h1 className="text-4xl sm:text-5xl text-balance">{title}</h1>
          <p className="text-sm text-grey-soft mt-4">Última actualización: {updated}</p>
          <div className="mt-12">{children}</div>
        </div>
      </main>

      <footer className="border-t border-rule">
        <div className="max-w-3xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="font-display text-[0.6rem] tracking-[0.26em] uppercase text-grey-light">Hecho con Escuadra</p>
          <p className="text-xs text-grey-soft">
            ¿Dudas sobre tus datos? <a href="mailto:marianonoceti@gmail.com" className="text-ink underline underline-offset-2">marianonoceti@gmail.com</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Sección numerada estilo "cota": hairline + índice + título + cuerpo. */
export function Sec({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule pt-7 mt-10 first:mt-0 first:border-t-0 first:pt-0">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-display text-xs text-grey-light tabular-nums">{n}</span>
        <h2 className="text-xl">{title}</h2>
      </div>
      <div className="space-y-3 text-grey leading-relaxed text-[0.95rem]">{children}</div>
    </section>
  );
}

export function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5 marker:text-grey-light">{children}</ul>;
}
