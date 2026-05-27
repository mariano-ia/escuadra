import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/db/supabase";
import { signedUrls } from "@/lib/storage";
import { SearchClient } from "@/app/(panel)/buscar/search-client";
import { ZoomImage } from "@/components/zoom-image";
import { Paginator } from "@/components/paginator";
import { PAGE_SIZE } from "@/lib/ui/pagination";

const TYPE_LABEL: Record<string, string> = {
  photo: "Fotos", audio: "Audio", text: "Nota", note: "Nota", quote: "Cotización",
  approval: "Aprobación", payment: "Pago", issue: "Problema", visit: "Visita", delivery: "Entrega", video: "Video",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function ObraDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const page = Math.max(1, parseInt((await searchParams).page ?? "1", 10) || 1);
  const sb = await createServerClient();

  const { data: obra } = await sb.from("obras").select("*").eq("id", id).maybeSingle();
  if (!obra) notFound();

  const fromRow = (page - 1) * PAGE_SIZE;
  const [{ data: entries, count }, { data: photos }] = await Promise.all([
    sb.from("timeline_entries").select("id, type, body_text, occurred_at, needs_review", { count: "exact" }).eq("obra_id", id).order("occurred_at", { ascending: false }).range(fromRow, fromRow + PAGE_SIZE - 1),
    sb.from("photos").select("id, storage_path, caption, created_at").eq("obra_id", id).order("created_at", { ascending: false }).limit(60),
  ]);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // Audios SOLO de las entries de esta página (media_assets no tiene obra_id → por timeline_entry).
  const entryIds = (entries ?? []).map((e) => e.id);
  const { data: audios } = entryIds.length
    ? await sb.from("media_assets").select("storage_path, timeline_entry_id").eq("kind", "audio").in("timeline_entry_id", entryIds)
    : { data: [] as { storage_path: string; timeline_entry_id: string | null }[] };

  // entry_id → storage_path del audio, para mostrar el reproductor en su renglón del timeline.
  const audioByEntry = new Map<string, string>();
  for (const a of audios ?? []) if (a.timeline_entry_id) audioByEntry.set(a.timeline_entry_id, a.storage_path);

  const urls = await signedUrls([
    ...(photos ?? []).map((p) => p.storage_path),
    ...(audios ?? []).map((a) => a.storage_path),
  ]);

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

      {/* Buscador de la obra */}
      <section className="mb-10 max-w-xl">
        <SearchClient obraId={id} autoFocus={false} />
      </section>

      {/* Galería */}
      {photos && photos.length > 0 && (
        <section className="mb-12">
          <h2 className="font-display text-xs tracking-[0.2em] uppercase text-grey-soft mb-3">Galería</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {photos.map((p) =>
              urls[p.storage_path] ? (
                <ZoomImage
                  key={p.id}
                  src={urls[p.storage_path]}
                  alt={p.caption ?? ""}
                  className="aspect-square border border-rule overflow-hidden bg-paper hover:opacity-90"
                />
              ) : (
                <div key={p.id} className="aspect-square border border-rule bg-paper" />
              ),
            )}
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
              <li key={e.id} className="flex items-start gap-4 py-3 border-b border-rule-soft">
                <span className="font-display text-[0.62rem] tracking-[0.18em] uppercase text-grey-soft w-24 shrink-0 pt-0.5">
                  {TYPE_LABEL[e.type] ?? e.type}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-ink">
                    {e.body_text || <span className="text-grey-soft">—</span>}
                    {e.needs_review && (
                      <span className="ml-2 text-[0.62rem] font-display tracking-[0.1em] uppercase text-grey-light">
                        · sin clasificar
                      </span>
                    )}
                  </span>
                  {audioByEntry.get(e.id) && urls[audioByEntry.get(e.id)!] && (
                    <audio controls preload="none" src={urls[audioByEntry.get(e.id)!]} className="mt-2 w-full max-w-sm" />
                  )}
                </div>
                <span className="text-xs text-grey-light shrink-0 pt-0.5">{fmtDate(e.occurred_at)}</span>
              </li>
            ))}
          </ul>
        )}
        <Paginator page={page} totalPages={totalPages} makeHref={(p) => `/obras/${id}?page=${p}`} />
      </section>
    </div>
  );
}
