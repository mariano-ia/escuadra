"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, null);
  return (
    <main className="min-h-screen grid place-items-center bg-grid px-6 py-16">
      <div className="w-full max-w-md">
        <p className="font-display text-xs tracking-[0.36em] uppercase text-grey-soft mb-8">
          Escuadra
        </p>
        <h1 className="text-3xl mb-8">Iniciá sesión</h1>
        <form action={action} className="space-y-4">
          <label className="block">
            <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none focus:border-grey"
            />
          </label>
          <label className="block">
            <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">
              Contraseña
            </span>
            <input
              name="password"
              type="password"
              required
              className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none focus:border-grey"
            />
          </label>
          {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-ink text-bg font-display text-sm tracking-wide py-3 mt-2 disabled:opacity-50"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="text-sm text-grey mt-6">
          ¿No tenés cuenta?{" "}
          <Link href="/signup" className="text-ink underline underline-offset-4">
            Creá tu estudio
          </Link>
        </p>
      </div>
    </main>
  );
}
