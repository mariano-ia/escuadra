import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/db/supabase";
import { signedUrls } from "@/lib/storage";

const TYPE_LABEL: Record<string, string> = {
  photo: "Fotos", audio: "Audio", text: "Nota", note: "Nota", quote: "Cotización",
  approval: "Aprobación", payment: "Pago", issue: "Problema", visit: "Visita", delivery: "Entrega", video: "Video",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createServerClient();

  const { data: obra } = await sb.from("obras").select("*").eq("id", id).maybeSingle();
  if (!obra) notFound();

  const [{ data: entries }, { data: photos }] = await Promise.all([
    sb.from("timeline_entries").select("id, type, body_text, occurred_at, needs_review").eq("obra_id", id).order("occurred_at", { ascending: false }).limit(100),
    sb.from("photos").select("id, storage_path, caption, created_at").eq("obra_id", id).order("created_at", { ascending: false }).limit(60),
  ]);

  const urls = await signedUrls((photos ?? []).map((p) => p.storage_path));

  return (
    <div>
      <Link href="/obras" className="font-display text-xs tracking-[0.16em] uppercase text-grey-soft hover:text-ink">
        ← Obras
      </Link>
      <div className="flex items-end justify-between mt-3 mb-8">
        <div>
          <h1 className="text-3xl">{obra.name}</h1>
          {obra.address && <p className="text-grey mt-1">{obra.address}</p>}
        </div>
        <div className="flex items-center gap-5">
          {obra.client_name && (
            <span className="font-display text-xs tracking-[0.2em] uppercase text-grey-light">{obra.client_name}</span>
          )}
          <Link
            href={`/obras/${id}/informe`}
            className="bg-ink text-bg font-display text-xs tracking-[0.12em] uppercase px-4 py-2.5 whitespace-nowrap"
          >
            Generar informe
          </Link>
        </div>
      </div>

      {/* Galería */}
      {photos && photos.length > 0 && (
        <section className="mb-12">
          <h2 className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-3">Galería</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="aspect-square border border-rule overflow-hidden bg-paper">
                {urls[p.storage_path] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[p.storage_path]} alt={p.caption ?? ""} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Línea de tiempo */}
      <section>
        <h2 className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-3">Línea de tiempo</h2>
        {!entries || entries.length === 0 ? (
          <p className="text-grey text-sm border border-rule p-6">
            Todavía no hay nada. Reenviá una foto, audio o cotización por WhatsApp y aparece acá.
          </p>
        ) : (
          <ul className="border-t border-rule-soft">
            {entries.map((e) => (
              <li key={e.id} className="flex items-baseline gap-4 py-3 border-b border-rule-soft">
                <span className="font-display text-[0.62rem] tracking-[0.18em] uppercase text-grey-soft w-24 shrink-0">
                  {TYPE_LABEL[e.type] ?? e.type}
                </span>
                <span className="flex-1 text-sm text-ink">
                  {e.body_text || <span className="text-grey-soft">—</span>}
                  {e.needs_review && (
                    <span className="ml-2 text-[0.62rem] font-display tracking-[0.1em] uppercase text-grey-light">
                      · sin clasificar
                    </span>
                  )}
                </span>
                <span className="text-xs text-grey-light shrink-0">{fmtDate(e.occurred_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
