"use client";

import { useActionState, useState } from "react";
import { createReportAction, type ReportState } from "./actions";
import { RichText } from "./rich-text";

type Photo = { id: string; url: string };

export function ReportBuilder({ obraId, photos }: { obraId: string; photos: Photo[] }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(createReportAction, null);
  const [copied, setCopied] = useState(false);
  // Selección de fotos: arranca VACÍA → tocar = incluir (lo que tocás es lo que va al informe).
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (state?.token) {
    const link = typeof window !== "undefined" ? `${window.location.origin}/r/${state.token}` : `/r/${state.token}`;
    return (
      <div className="border border-ink p-6 max-w-xl">
        <p className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-2">Informe generado</p>
        <p className="text-sm text-grey mb-4">Compartí este link con tu cliente por WhatsApp:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-paper border border-rule px-3 py-2 text-sm truncate">{link}</code>
          <button
            onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); }}
            className="bg-ink text-bg font-display text-xs tracking-wide px-4 py-2.5"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
        <a href={link} target="_blank" rel="noreferrer" className="inline-block mt-4 text-sm underline underline-offset-4">
          Ver informe →
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-start">
      <input type="hidden" name="obraId" value={obraId} />

      {/* Columna izquierda — fotos */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft">
            Fotos
            {photos.length > 0 && <span className="text-grey-light"> · {selected.size} de {photos.length}</span>}
          </p>
          {photos.length > 0 && (
            <div className="flex gap-4 font-display text-[0.7rem] tracking-[0.1em] uppercase">
              <button type="button" onClick={() => setSelected(new Set(photos.map((p) => p.id)))} className="text-grey hover:text-ink underline underline-offset-4">Todas</button>
              <button type="button" onClick={() => setSelected(new Set())} className="text-grey hover:text-ink underline underline-offset-4">Ninguna</button>
            </div>
          )}
        </div>
        {photos.length === 0 ? (
          <p className="text-sm text-grey border border-rule p-5">
            Esta obra todavía no tiene fotos. Podés generar el informe igual y sumar fotos más adelante.
          </p>
        ) : (
          <>
            <p className="text-sm text-grey mb-3">Tocá las fotos que querés en el informe. Las marcadas con ✓ son las que van.</p>
            {[...selected].map((id) => (
              <input key={id} type="hidden" name="photo" value={id} />
            ))}
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => {
                const on = selected.has(p.id);
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    aria-pressed={on}
                    className={`relative aspect-square overflow-hidden border transition ${on ? "border-ink ring-2 ring-ink" : "border-rule hover:border-grey-soft"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className={`w-full h-full object-cover transition ${on ? "" : "grayscale opacity-40"}`} />
                    {on && (
                      <span className="absolute top-1.5 right-1.5 w-6 h-6 bg-ink text-bg flex items-center justify-center text-sm leading-none">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Columna derecha — texto */}
      <div>
        <label className="block mb-5">
          <span className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft">Título</span>
          <input
            name="title"
            defaultValue="Avance de obra"
            className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none font-display text-lg"
          />
        </label>
        <p className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-2">Nota para el cliente</p>
        <RichText name="note" />
        {state?.error && <p className="text-sm text-red-700 mt-3">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-bg font-display text-sm tracking-wide px-6 py-3 mt-5 disabled:opacity-50"
        >
          {pending
            ? "Generando…"
            : selected.size > 0
              ? `Generar link · ${selected.size} ${selected.size === 1 ? "foto" : "fotos"}`
              : "Generar sin fotos"}
        </button>
      </div>
    </form>
  );
}
