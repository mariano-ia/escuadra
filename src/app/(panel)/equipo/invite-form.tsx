"use client";

import { useActionState, useState } from "react";
import { createInviteAction, type InviteState } from "./actions";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInviteAction, null);
  const [copied, setCopied] = useState(false);
  const link = state?.token && typeof window !== "undefined" ? `${window.location.origin}/invitacion/${state.token}` : null;

  return (
    <div>
      <form action={action} className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className="block flex-1">
          <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">Email</span>
          <input name="email" type="email" required placeholder="alguien@estudio.com" className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none placeholder:text-grey-light" />
        </label>
        <label className="block">
          <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">Rol</span>
          <select name="role" defaultValue="member" className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none text-sm">
            <option value="member">Miembro</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" disabled={pending} className="bg-ink text-bg font-display text-sm tracking-wide px-5 py-2.5 disabled:opacity-50 whitespace-nowrap">
          {pending ? "Creando…" : "Crear invitación"}
        </button>
      </form>

      {state?.error && <p className="text-sm text-red-700 mt-3">{state.error}</p>}

      {link && (
        <div className="mt-4 border border-ink p-4">
          <p className="text-sm text-grey mb-2">
            Invitación para <span className="text-ink">{state!.email}</span>. Pasale este link (WhatsApp, mail, lo que sea) — al abrirlo crea su cuenta y entra al estudio:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-paper border border-rule px-3 py-2 text-xs truncate">{link}</code>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); }} className="bg-ink text-bg font-display text-xs tracking-wide px-4 py-2.5 shrink-0">
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
