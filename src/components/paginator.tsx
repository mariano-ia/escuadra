import Link from "next/link";
import { pageWindow } from "@/lib/ui/pagination";

/** Paginador clásico por links (server component). makeHref construye la URL de cada página. */
export function Paginator({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  const cell = (active: boolean) =>
    `min-w-9 h-9 px-2 grid place-items-center font-display text-sm border transition-colors ${
      active ? "border-ink bg-ink text-bg" : "border-rule text-grey hover:border-ink hover:text-ink"
    }`;

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-8" aria-label="Paginación">
      {page > 1 ? (
        <Link href={makeHref(page - 1)} className={cell(false)} aria-label="Anterior">‹</Link>
      ) : (
        <span className={`${cell(false)} opacity-40 pointer-events-none`} aria-hidden>‹</span>
      )}
      {pageWindow(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-1 text-grey-light">…</span>
        ) : (
          <Link key={p} href={makeHref(p)} className={cell(p === page)} aria-current={p === page ? "page" : undefined}>
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={makeHref(page + 1)} className={cell(false)} aria-label="Siguiente">›</Link>
      ) : (
        <span className={`${cell(false)} opacity-40 pointer-events-none`} aria-hidden>›</span>
      )}
    </nav>
  );
}
