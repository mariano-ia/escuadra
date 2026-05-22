"use client";

import { useActionState, useState } from "react";
import { createReportAction, type ReportState } from "./actions";

type Photo = { id: string; url: string };

export function ReportBuilder({ obraId, photos }: { obraId: string; photos: Photo[] }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(createReportAction, null);
  const [copied, setCopied] = useState(false);

  if (state?.token) {
    const link = typeof window !== "undefined" ? `${window.location.origin}/r/${state.token}` : `/r/${state.token}`;
    return (
      <div className="border border-ink p-6 max-w-xl">
        <p className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-2">
          Informe generado
        </p>
        <p className="text-sm text-grey mb-4">Compartí este link con tu cliente por WhatsApp:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-paper border border-rule px-3 py-2 text-sm truncate">{link}</code>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(link);
              setCopied(true);
            }}
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
    <form action={action} className="space-y-6">
      <input type="hidden" name="obraId" value={obraId} />
      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
        <label className="block">
          <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">Título</span>
          <input
            name="title"
            defaultValue="Avance de obra"
            className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none"
          />
        </label>
        <label className="block">
          <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">Nota (opcional)</span>
          <input
            name="note"
            placeholder="Avance de la semana"
            className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none placeholder:text-grey-light"
          />
        </label>
      </div>

      {photos.length === 0 ? (
        <p className="text-grey text-sm border border-rule p-6">
          Esta obra todavía no tiene fotos. Reenviá algunas por WhatsApp y volvé.
        </p>
      ) : (
        <fieldset>
          <legend className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-3">
            Elegí las fotos
          </legend>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {photos.map((p) => (
              <label key={p.id} className="relative cursor-pointer aspect-square border border-rule overflow-hidden has-[:checked]:ring-2 has-[:checked]:ring-ink">
                <input type="checkbox" name="photo" value={p.id} defaultChecked className="peer sr-only" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-full object-cover opacity-60 peer-checked:opacity-100" />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending || photos.length === 0}
        className="bg-ink text-bg font-display text-sm tracking-wide px-6 py-3 disabled:opacity-50"
      >
        {pending ? "Generando…" : "Generar link"}
      </button>
    </form>
  );
}
