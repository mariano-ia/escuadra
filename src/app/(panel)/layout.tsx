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
  { href: "/buscar", label: "Buscar" },
  { href: "/conectar", label: "Conectar WhatsApp" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getActiveStudio();
  if (!ctx) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-rule">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <span className="font-display font-semibold tracking-[0.3em] uppercase text-sm">
              Escuadra
            </span>
            <nav className="hidden sm:flex items-center gap-6">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="font-display text-xs tracking-[0.16em] uppercase text-grey hover:text-ink transition-colors"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-grey">{ctx.studio.name}</span>
            <form action={signOut}>
              <button className="font-display text-xs tracking-[0.16em] uppercase text-grey-soft hover:text-ink">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
