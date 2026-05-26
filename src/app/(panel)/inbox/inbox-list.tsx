"use client";

import { useState } from "react";
import Link from "next/link";
import { moveEntryAction } from "./actions";

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

function Item({ e, obras }: { e: Entry; obras: Obra[] }) {
  const [open, setOpen] = useState(false);
  const body = e.body ?? "";
  const long = body.length > MAX;
  const text = open || !long ? body : body.slice(0, MAX) + "…";
  return (
    <li className="border border-rule p-4 flex gap-4">
      {e.photos.length > 0 && (
        <div className="flex gap-2 shrink-0">
          {e.photos.slice(0, 2).map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="w-16 h-16 object-cover border border-rule hover:opacity-80" />
            </a>
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
          <form action={moveEntryAction} className="mt-2 flex items-center gap-2">
            <input type="hidden" name="entryId" value={e.id} />
            <select name="obraId" defaultValue="" className="border border-rule bg-bg text-xs py-1.5 px-2 outline-none focus:border-ink">
              <option value="" disabled>Mover a obra…</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <button className="bg-ink text-bg font-display text-xs tracking-wide px-3 py-1.5">Mover</button>
          </form>
        )}
      </div>
    </li>
  );
}

export function InboxList({ entries, obras }: { entries: Entry[]; obras: Obra[] }) {
  const [filter, setFilter] = useState<string>("all");
  const inboxCount = entries.filter((e) => e.is_inbox).length;
  const filtered = entries.filter((e) =>
    filter === "all" ? true : filter === "inbox" ? e.is_inbox : e.obra_id === filter,
  );
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>Todas</Chip>
        <Chip active={filter === "inbox"} onClick={() => setFilter("inbox")}>
          Sin clasificar{inboxCount ? ` (${inboxCount})` : ""}
        </Chip>
        {obras.map((o) => (
          <Chip key={o.id} active={filter === o.id} onClick={() => setFilter(o.id)}>{o.name}</Chip>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="border border-rule p-10 text-center text-grey">Nada por acá todavía.</div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => <Item key={e.id} e={e} obras={obras} />)}
        </ul>
      )}
    </div>
  );
}
