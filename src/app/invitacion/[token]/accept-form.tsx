"use client";

import { useActionState } from "react";
import { acceptInviteAction, type AcceptState } from "./actions";

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptInviteAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <label className="block">
        <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">Email</span>
        <input value={email} readOnly className="mt-1 w-full border-b border-rule bg-paper py-2 outline-none text-grey" />
      </label>
      <label className="block">
        <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">Tu nombre</span>
        <input name="fullName" required autoFocus className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none" />
      </label>
      <label className="block">
        <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">Contraseña</span>
        <input name="password" type="password" required minLength={8} className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none" />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" disabled={pending} className="bg-ink text-bg font-display text-sm tracking-wide px-6 py-3 disabled:opacity-50 w-full">
        {pending ? "Entrando…" : "Crear cuenta y entrar"}
      </button>
    </form>
  );
}
