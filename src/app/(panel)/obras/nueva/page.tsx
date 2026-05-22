"use client";

import { useActionState } from "react";
import { createObraAction, type CreateObraState } from "./actions";

export default function NuevaObraPage() {
  const [state, action, pending] = useActionState<CreateObraState, FormData>(createObraAction, null);
  return (
    <div className="max-w-lg">
      <h1 className="text-3xl mb-8">Nueva obra</h1>
      <form action={action} className="space-y-4">
        {[
          { name: "name", label: "Nombre de la obra", ph: "Casa Belgrano", required: true },
          { name: "address", label: "Dirección", ph: "Cabildo 2100", required: false },
          { name: "clientName", label: "Cliente", ph: "Familia Roca", required: false },
        ].map((f) => (
          <label key={f.name} className="block">
            <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">
              {f.label}
            </span>
            <input
              name={f.name}
              required={f.required}
              placeholder={f.ph}
              className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none focus:border-grey placeholder:text-grey-light"
            />
          </label>
        ))}
        {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-bg font-display text-sm tracking-wide px-6 py-3 mt-2 disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear obra"}
        </button>
      </form>
    </div>
  );
}
