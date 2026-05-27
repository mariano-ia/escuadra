import { getActiveStudio } from "@/lib/auth/session";
import { listStudioMembers, listPendingInvites } from "@/lib/db/repos";
import { InviteForm } from "./invite-form";
import { revokeInviteAction } from "./actions";

const ROLE_LABEL: Record<string, string> = { owner: "Dueño", admin: "Admin", member: "Miembro" };

export default async function EquipoPage() {
  const ctx = await getActiveStudio();
  if (!ctx) return null;
  const canInvite = ctx.role === "owner" || ctx.role === "admin";

  const [members, invites] = await Promise.all([
    listStudioMembers(ctx.studio.id),
    canInvite ? listPendingInvites(ctx.studio.id) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl mb-1">Equipo</h1>
      <p className="text-grey mb-8">
        Todos en <span className="text-ink">{ctx.studio.name}</span> comparten las obras y la información. Se ve quién registró qué.
      </p>

      <section className="mb-12">
        <h2 className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-3">Miembros</h2>
        <ul className="border-t border-rule-soft">
          {members.map((m) => (
            <li key={m.userId} className="flex items-center justify-between py-3 border-b border-rule-soft">
              <div className="min-w-0">
                <p className="text-ink truncate">
                  {m.name ?? "—"}
                  {m.userId === ctx.user.id && <span className="text-grey-light text-xs"> · vos</span>}
                </p>
                <p className="text-sm text-grey truncate">{m.email ?? ""}</p>
              </div>
              <span className="font-display text-[0.62rem] tracking-[0.16em] uppercase text-grey-soft shrink-0 ml-4">
                {ROLE_LABEL[m.role] ?? m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canInvite ? (
        <section>
          <h2 className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-3">Sumar a alguien</h2>
          <InviteForm />

          {invites.length > 0 && (
            <div className="mt-10">
              <h3 className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-3">Invitaciones pendientes</h3>
              <ul className="border-t border-rule-soft">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between py-3 border-b border-rule-soft">
                    <div className="min-w-0">
                      <p className="text-ink text-sm truncate">{inv.email}</p>
                      <p className="text-xs text-grey-soft">{ROLE_LABEL[inv.role] ?? inv.role} · pendiente</p>
                    </div>
                    <form action={revokeInviteAction}>
                      <input type="hidden" name="inviteId" value={inv.id} />
                      <button type="submit" className="text-xs text-grey hover:text-ink underline underline-offset-4 shrink-0 ml-4">Cancelar</button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <p className="text-sm text-grey-soft">Solo el dueño o un admin pueden sumar gente.</p>
      )}
    </div>
  );
}
