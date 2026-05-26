import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveStudio } from "@/lib/auth/session";
import { createServerClient } from "@/lib/db/supabase";

async function signOut() {
  "use server";
  const sb = await createServerClient();
  await sb.auth.signOut();
  redirect("/login");
}

const NAV = [
  { href: "/obras", label: "Obras" },
  { href: "/inbox", label: "Inbox" },
  { href: "/buscar", label: "Buscar" },
  { href: "/settings", label: "Settings" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getActiveStudio();
  if (!ctx) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-5 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-3">
            <Link href="/obras" className="flex items-center gap-2 shrink-0" aria-label="Escuadra — inicio">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-ink" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21 21 21 3 4Z" />
                <line x1="7" y1="21" x2="7" y2="18" />
                <line x1="11" y1="21" x2="11" y2="18" />
                <line x1="15" y1="21" x2="15" y2="18" />
              </svg>
              <span className="font-display font-semibold tracking-[0.28em] uppercase text-sm">Escuadra</span>
            </Link>
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-sm text-grey truncate hidden sm:inline">{ctx.studio.name}</span>
              <form action={signOut}>
                <button className="font-display text-xs tracking-[0.16em] uppercase text-grey-soft hover:text-ink">
                  Salir
                </button>
              </form>
            </div>
          </div>
          <nav className="flex items-center gap-5 overflow-x-auto h-11 border-t border-rule-soft sm:h-auto sm:border-t-0 sm:pb-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="font-display text-xs tracking-[0.16em] uppercase text-grey hover:text-ink transition-colors whitespace-nowrap"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
