import Link from "next/link";
import { createServerClient } from "@/lib/db/supabase";

export default async function ObrasPage() {
  const sb = await createServerClient();
  const { data: obras } = await sb
    .from("obras")
    .select("id, name, address, client_name, status")
    .eq("is_inbox", false)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <h1 className="text-3xl">Obras</h1>
        <span className="font-display text-xs tracking-[0.2em] uppercase text-grey-light">
          {obras?.length ?? 0} activas
        </span>
      </div>

      {!obras || obras.length === 0 ? (
        <div className="border border-rule p-10 text-center">
          <p className="text-grey mb-2">Todavía no tenés obras.</p>
          <p className="text-sm text-grey-soft">
            Vinculá tu WhatsApp y reenviá la primera foto o cotización: Escuadra crea la obra y la
            ordena sola.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {obras.map((o) => (
            <Link
              key={o.id}
              href={`/obras/${o.id}`}
              className="group border border-rule p-6 hover:border-grey-soft transition-colors relative"
            >
              <h3 className="font-display text-lg mb-1">{o.name}</h3>
              {o.address && <p className="text-sm text-grey">{o.address}</p>}
              {o.client_name && (
                <p className="text-xs text-grey-soft mt-3 font-display tracking-[0.1em] uppercase">
                  {o.client_name}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
