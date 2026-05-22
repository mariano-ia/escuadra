import Link from "next/link";
import { createServerClient } from "@/lib/db/supabase";
import { getActiveStudio } from "@/lib/auth/session";

const KIND_LABEL: Record<string, string> = {
  timeline: "Obra",
  audio: "Audio",
  photo: "Foto",
  comment: "Comentario",
};

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const ctx = await getActiveStudio();
  type Row = { kind: string; id: string; obra_id: string; title: string; occurred_at: string };
  let results: Row[] = [];
  if (q && ctx) {
    const sb = await createServerClient();
    const { data } = await sb.rpc("universal_search", { target_studio: ctx.studio.id, q });
    results = (data ?? []) as Row[];
  }

  return (
    <div>
      <h1 className="text-3xl mb-6">Buscar</h1>
      <form className="mb-8">
        <div className="flex items-center gap-3 border-b border-ink py-2 max-w-xl">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-grey">
            <circle cx="11" cy="11" r="7" strokeWidth="1.4" />
            <path d="m21 21-4.3-4.3" strokeWidth="1.4" />
          </svg>
          <input
            name="q"
            defaultValue={q ?? ""}
            autoFocus
            placeholder="azulejo cromo, cotización plomería, humedad…"
            className="flex-1 bg-transparent outline-none font-display text-lg placeholder:text-grey-light"
          />
        </div>
      </form>

      {q && (
        <p className="font-display text-xs tracking-[0.2em] uppercase text-grey-light mb-4">
          {results.length} resultado{results.length === 1 ? "" : "s"} para “{q}”
        </p>
      )}

      <ul className="border-t border-rule-soft max-w-3xl">
        {results.map((r) => (
          <li key={`${r.kind}-${r.id}`} className="border-b border-rule-soft py-4">
            <Link href={`/obras/${r.obra_id}`} className="flex items-baseline gap-4 group">
              <span className="flex-1 text-ink group-hover:underline underline-offset-4">
                {r.title || <span className="text-grey-soft">(sin texto)</span>}
              </span>
              <span className="font-display text-[0.62rem] tracking-[0.18em] uppercase text-grey-soft border border-rule px-3 py-1">
                {KIND_LABEL[r.kind] ?? r.kind}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
