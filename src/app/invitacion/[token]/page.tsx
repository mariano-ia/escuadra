import Link from "next/link";
import { getInviteByToken } from "@/lib/db/repos";
import { getUser } from "@/lib/auth/session";
import { AcceptForm } from "./accept-form";
import { joinAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <div className="max-w-md text-center">
          <p className="font-display text-xs tracking-[0.3em] uppercase text-grey-soft mb-3">Escuadra</p>
          <h1 className="text-2xl mb-2">Invitación no válida</h1>
          <p className="text-grey">Este link no figura o ya venció. Pedile al estudio que te genere uno nuevo.</p>
          <Link href="/login" className="inline-block mt-6 text-sm underline underline-offset-4">Ir a iniciar sesión</Link>
        </div>
      </main>
    );
  }

  const user = await getUser();

  return (
    <main className="min-h-screen grid place-items-center px-6 py-10">
      <div className="w-full max-w-md">
        <p className="font-display text-xs tracking-[0.3em] uppercase text-grey-soft mb-3">Escuadra</p>
        <h1 className="text-2xl mb-1">Te sumaron a {invite.studioName}</h1>

        {user ? (
          <>
            <p className="text-grey mb-6">
              Estás con la sesión de <span className="text-ink">{user.email}</span>. Unite al estudio para compartir sus obras.
            </p>
            <form action={joinAction}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="bg-ink text-bg font-display text-sm tracking-wide px-6 py-3 w-full">
                Unirte a {invite.studioName}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-grey mb-6">Creá tu cuenta para entrar. Vas a compartir las obras del estudio.</p>
            <AcceptForm token={token} email={invite.email} />
          </>
        )}
      </div>
    </main>
  );
}
