"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ZoomImage } from "@/components/zoom-image";
import { moveEntryAction, moveManyAction } from "./actions";
import { pageWindow, PAGE_SIZE } from "@/lib/ui/pagination";

export type Entry = {
  id: string; type: string; body: string | null; occurred_at: string;
  obra_id: string; obra_name: string; is_inbox: boolean; photos: string[];
};
type Obra = { id: string; name: string };

const TYPE: Record<string, string> = {
  photo: "Fotos", audio: "Audio", text: "Nota", note: "Nota", quote: "Cotización",
  approval: "Aprobación", payment: "Pago", issue: "Problema", visit: "Visita", delivery: "Entrega", video: "Video",
};
const fmt = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const MAX = 160;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`font-display text-xs tracking-[0.1em] uppercase px-3 py-1.5 border whitespace-nowrap transition-colors ${active ? "border-ink bg-ink text-bg" : "border-rule text-grey hover:border-grey-soft"}`}
    >
      {children}
    </button>
  );
}

function ObraSelect({ obras, value, onChange }: { obras: Obra[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const sel = obras.find((o) => o.id === value);
  const filtered = obras.filter((o) => o.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`font-display text-xs tracking-[0.1em] uppercase px-3 py-1.5 border whitespace-nowrap inline-flex items-center gap-1.5 ${sel ? "border-ink bg-ink text-bg" : "border-rule text-grey hover:border-grey-soft"}`}
      >
        {sel ? sel.name : "Obra"}
        <ChevronDown className="w-3.5 h-3.5 opacity-70" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-60 bg-bg border border-ink shadow-xl">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar obra…"
              className="w-full px-3 py-2 border-b border-rule text-sm outline-none placeholder:text-grey-light"
            />
            <ul className="max-h-60 overflow-y-auto">
              {filtered.length === 0 && <li className="px-3 py-2 text-xs text-grey-soft">Sin resultados</li>}
              {filtered.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => { onChange(o.id); setOpen(false); setQ(""); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-paper"
                  >
                    {o.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

/** Chips de obra para asignar en un toque. */
function ObraChips({ obras, onPick, disabled }: { obras: Obra[]; onPick: (id: string) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {obras.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={disabled}
          onClick={() => onPick(o.id)}
          className="font-display text-[0.62rem] tracking-[0.06em] uppercase px-2.5 py-1 border border-rule text-grey hover:border-ink hover:text-ink disabled:opacity-40 transition-colors"
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

function Item({
  e, obras, selected, onToggle, onMove, busy,
}: {
  e: Entry; obras: Obra[]; selected: boolean; onToggle: () => void; onMove: (entryId: string, obraId: string) => void; busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const body = e.body ?? "";
  const long = body.length > MAX;
  const text = open || !long ? body : body.slice(0, MAX) + "…";
  return (
    <li className={`border p-4 flex gap-4 ${selected ? "border-ink" : "border-rule"}`}>
      {e.is_inbox && (
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label="Seleccionar" className="mt-1 shrink-0 w-4 h-4 accent-black" />
      )}
      {e.photos.length > 0 && (
        <div className="flex gap-2 shrink-0">
          {e.photos.slice(0, 2).map((u, i) => (
            <ZoomImage key={i} src={u} className="w-16 h-16 border border-rule hover:opacity-80" />
          ))}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-display text-[0.6rem] tracking-[0.16em] uppercase text-grey-soft">{TYPE[e.type] ?? e.type}</span>
          <Link
            href={`/obras/${e.obra_id}`}
            className={`font-display text-[0.6rem] tracking-[0.1em] uppercase px-2 py-0.5 border ${e.is_inbox ? "border-grey-light text-grey-soft" : "border-rule text-ink hover:border-ink"}`}
          >
            {e.obra_name}
          </Link>
          <span className="text-[0.62rem] text-grey-light ml-auto">{fmt(e.occurred_at)}</span>
        </div>
        <p className="text-sm text-ink whitespace-pre-wrap break-words">{text || <span className="text-grey-soft">—</span>}</p>
        {long && (
          <button onClick={() => setOpen(!open)} className="mt-1 text-xs text-grey-soft hover:text-ink underline underline-offset-2">
            {open ? "ver menos" : "ver más"}
          </button>
        )}
        {e.is_inbox && obras.length > 0 && (
          <div className="mt-3">
            <p className="text-[0.58rem] tracking-[0.14em] uppercase text-grey-soft mb-1.5 font-display">Mover a</p>
            <ObraChips obras={obras} disabled={busy} onPick={(obraId) => onMove(e.id, obraId)} />
          </div>
        )}
      </div>
    </li>
  );
}

function PageBtn({ active, disabled, onClick, children }: { active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-w-9 h-9 px-2 grid place-items-center font-display text-sm border transition-colors disabled:opacity-40 disabled:pointer-events-none ${active ? "border-ink bg-ink text-bg" : "border-rule text-grey hover:border-ink hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

export function InboxList({ entries, obras }: { entries: Entry[]; obras: Obra[] }) {
  // Arranca en "Sin clasificar" si hay algo para triar (la vista accionable).
  const [filter, setFilter] = useState<string>(() => (entries.some((e) => e.is_inbox) ? "inbox" : "all"));
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, startTransition] = useTransition();

  const changeFilter = (f: string) => { setFilter(f); setPage(1); setSel(new Set()); };

  const inboxCount = entries.filter((e) => e.is_inbox).length;
  const filtered = entries.filter((e) =>
    filter === "all" ? true : filter === "inbox" ? e.is_inbox : e.obra_id === filter,
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggle = (id: string) =>
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const moveOne = (entryId: string, obraId: string) =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("entryId", entryId);
      fd.set("obraId", obraId);
      await moveEntryAction(fd);
      setSel((prev) => { const n = new Set(prev); n.delete(entryId); return n; });
    });

  const moveMany = (obraId: string) =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("obraId", obraId);
      sel.forEach((id) => fd.append("entryId", id));
      await moveManyAction(fd);
      setSel(new Set());
    });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Chip active={filter === "all"} onClick={() => changeFilter("all")}>Todas</Chip>
        <Chip active={filter === "inbox"} onClick={() => changeFilter("inbox")}>
          Sin clasificar{inboxCount ? ` (${inboxCount})` : ""}
        </Chip>
        <ObraSelect obras={obras} value={filter !== "all" && filter !== "inbox" ? filter : ""} onChange={changeFilter} />
      </div>

      {/* Barra de asignación masiva */}
      {sel.size > 0 && obras.length > 0 && (
        <div className="sticky top-2 z-10 bg-bg border border-ink p-3 mb-3 flex items-center gap-3 flex-wrap shadow-sm">
          <span className="font-display text-xs tracking-[0.1em] uppercase text-ink whitespace-nowrap">
            {sel.size} seleccionada{sel.size > 1 ? "s" : ""}
          </span>
          <span className="text-xs text-grey">mover a</span>
          <ObraChips obras={obras} disabled={busy} onPick={moveMany} />
          <button onClick={() => setSel(new Set())} className="ml-auto text-xs text-grey hover:text-ink underline underline-offset-2">
            Cancelar
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="border border-rule p-10 text-center text-grey">Nada por acá todavía.</div>
      ) : (
        <>
          <ul className="space-y-2">
            {pageItems.map((e) => (
              <Item key={e.id} e={e} obras={obras} selected={sel.has(e.id)} onToggle={() => toggle(e.id)} onMove={moveOne} busy={busy} />
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-1.5 mt-6" aria-label="Paginación">
              <PageBtn disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</PageBtn>
              {pageWindow(safePage, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-1 text-grey-light">…</span>
                ) : (
                  <PageBtn key={p} active={p === safePage} onClick={() => setPage(p as number)}>{p}</PageBtn>
                ),
              )}
              <PageBtn disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>›</PageBtn>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
