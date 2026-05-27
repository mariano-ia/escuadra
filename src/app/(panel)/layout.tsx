import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, LogOut } from "lucide-react";
import { getActiveStudio } from "@/lib/auth/session";
import { createServerClient } from "@/lib/db/supabase";
import { NavLinks } from "./nav-links";

async function signOut() {
  "use server";
  const sb = await createServerClient();
  await sb.auth.signOut();
  redirect("/login");
}

const NAV = [
  { href: "/inbox", label: "Inbox" },
  { href: "/obras", label: "Obras" },
  { href: "/equipo", label: "Equipo" },
];

const GREETINGS = [
  "¿Qué se construye hoy?",
  "Tu obra, en orden.",
  "Reenviá tranquilo, yo lo ordeno.",
  "Todo lo importante, en su lugar.",
  "Listo para sumar a la obra.",
  "La memoria de tus obras, al día.",
  "Mandá fotos, audios o cotizaciones — yo me encargo.",
  "Que no se te escape ninguna cotización.",
];

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute top-full right-0 mt-1 px-2 py-1 text-[0.58rem] font-display uppercase tracking-[0.12em] bg-ink text-bg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
      {children}
    </span>
  );
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getActiveStudio();
  if (!ctx) redirect("/login");
  const sb = await createServerClient();
  const { data: prof } = await sb.from("profiles").select("full_name").eq("id", ctx.user.id).maybeSingle();
  const first = (prof?.full_name ?? "").trim().split(/\s+/)[0] || "";
  const msg = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra de navegación (sola) */}
      <header className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 sm:gap-8 min-w-0">
            <Link href="/inbox" className="flex items-center gap-2 shrink-0" aria-label="Escuadra — inicio">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-ink" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 21 21 21 3 4Z" />
                <line x1="7" y1="21" x2="7" y2="18" />
                <line x1="11" y1="21" x2="11" y2="18" />
                <line x1="15" y1="21" x2="15" y2="18" />
              </svg>
              <span className="font-display font-semibold tracking-[0.28em] uppercase text-sm hidden sm:inline">Escuadra</span>
            </Link>
            <NavLinks items={NAV} />
          </div>
          <div className="flex items-center gap-1">
            <div className="relative group">
              <Link href="/settings" aria-label="Configuración" className="grid place-items-center w-9 h-9 text-grey hover:text-ink transition-colors">
                <Settings className="w-[18px] h-[18px]" strokeWidth={1.6} />
              </Link>
              <Tip>Configuración</Tip>
            </div>
            <form action={signOut}>
              <div className="relative group">
                <button type="submit" aria-label="Salir" className="grid place-items-center w-9 h-9 text-grey hover:text-ink transition-colors">
                  <LogOut className="w-[18px] h-[18px]" strokeWidth={1.6} />
                </button>
                <Tip>Salir</Tip>
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Saludo (debajo de la nav) */}
      <div className="border-b border-rule-soft bg-paper/40">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-2.5">
          <p className="text-sm text-grey">
            <span className="text-ink font-medium">Hola{first ? `, ${first}` : ""}.</span> {msg}
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-6 py-8">{children}</main>

      <footer className="border-t border-rule mt-8">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-display text-[0.58rem] tracking-[0.24em] uppercase text-grey-light">
            © {new Date().getFullYear()} Escuadra
          </p>
          <nav className="flex items-center gap-5 text-xs text-grey-soft">
            <Link href="/privacidad" className="hover:text-ink transition-colors">Privacidad</Link>
            <Link href="/terminos" className="hover:text-ink transition-colors">Términos</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
