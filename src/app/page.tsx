import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-grid grid place-items-center px-6">
      <div className="max-w-xl text-center">
        <p className="font-display text-xs tracking-[0.36em] uppercase text-grey-soft mb-6">
          Escuadra
        </p>
        <h1 className="text-4xl sm:text-5xl leading-tight mb-5 text-balance">
          El orden de tu obra,
          <br />
          sin cambiar cómo trabajás.
        </h1>
        <p className="text-grey mb-10 max-w-md mx-auto">
          Escuadra organiza sola toda la información que hoy se te pierde en WhatsApp. Vos seguís
          igual.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="bg-ink text-bg font-display text-sm tracking-wide px-6 py-3"
          >
            Crear tu estudio
          </Link>
          <Link
            href="/login"
            className="border border-ink font-display text-sm tracking-wide px-6 py-3"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
