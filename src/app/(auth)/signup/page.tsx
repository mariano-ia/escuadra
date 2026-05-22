"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type AuthState } from "./actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signupAction, null);
  return (
    <main className="min-h-screen grid place-items-center bg-grid px-6 py-16">
      <div className="w-full max-w-md">
        <p className="font-display text-xs tracking-[0.36em] uppercase text-grey-soft mb-8">
          Escuadra
        </p>
        <h1 className="text-3xl mb-2">Creá tu estudio</h1>
        <p className="text-grey text-sm mb-8">
          El orden de tu obra, sin cambiar cómo trabajás.
        </p>
        <form action={action} className="space-y-4">
          <Field name="studioName" label="Nombre del estudio" placeholder="Estudio Belgrano" />
          <Field name="fullName" label="Tu nombre" placeholder="Mariano Noceti" />
          <Field name="email" label="Email" type="email" placeholder="vos@estudio.com" />
          <Field name="password" label="Contraseña" type="password" placeholder="mínimo 8 caracteres" />
          {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-ink text-bg font-display text-sm tracking-wide py-3 mt-2 disabled:opacity-50"
          >
            {pending ? "Creando…" : "Crear cuenta"}
          </button>
        </form>
        <p className="text-sm text-grey mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-ink underline underline-offset-4">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-display text-xs tracking-[0.18em] uppercase text-grey-soft">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required
        placeholder={placeholder}
        className="mt-1 w-full border-b border-ink bg-transparent py-2 outline-none focus:border-grey placeholder:text-grey-light"
      />
    </label>
  );
}
