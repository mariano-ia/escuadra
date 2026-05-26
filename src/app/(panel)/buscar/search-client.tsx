"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Row = { kind: string; id: string; obra_id: string; title: string };
const KIND: Record<string, string> = { timeline: "Obra", audio: "Audio", photo: "Foto", comment: "Comentario" };

export function SearchClient({ obraId, autoFocus = true }: { obraId?: string; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const u = new URL("/api/search", window.location.origin);
        u.searchParams.set("q", q);
        if (obraId) u.searchParams.set("obra", obraId);
        const res = await fetch(u, { signal: ctrl.signal });
        const j = await res.json();
        setResults(j.results ?? []);
      } catch {
        /* abort */
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, obraId]);

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-ink py-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5 text-grey">
          <circle cx="11" cy="11" r="7" strokeWidth="1.4" />
          <path d="m21 21-4.3-4.3" strokeWidth="1.4" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus={autoFocus}
          placeholder={obraId ? "Buscar en esta obra…" : "azulejo cromo, cotización plomería, humedad…"}
          className="flex-1 bg-transparent outline-none font-display text-base placeholder:text-grey-light"
        />
        {loading && <span className="text-xs text-grey-light">…</span>}
      </div>

      {q.trim().length >= 2 && (
        <ul className="mt-2 border-t border-rule-soft">
          {results.length === 0 && !loading ? (
            <li className="py-3 text-sm text-grey-soft">Sin resultados.</li>
          ) : (
            results.map((r) => (
              <li key={`${r.kind}-${r.id}`} className="border-b border-rule-soft py-3">
                <Link href={`/obras/${r.obra_id}`} className="flex items-baseline gap-3 group">
                  <span className="flex-1 text-sm text-ink group-hover:underline underline-offset-4">
                    {r.title || <span className="text-grey-soft">(sin texto)</span>}
                  </span>
                  <span className="font-display text-[0.6rem] tracking-[0.16em] uppercase text-grey-soft border border-rule px-2 py-0.5 shrink-0">
                    {KIND[r.kind] ?? r.kind}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
