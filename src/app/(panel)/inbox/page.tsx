import { createServerClient } from "@/lib/db/supabase";
import { signedUrls } from "@/lib/storage";
import { moveEntryAction } from "./actions";

const TYPE_LABEL: Record<string, string> = {
  photo: "Fotos", audio: "Audio", text: "Nota", note: "Nota", quote: "Cotización",
  approval: "Aprobación", payment: "Pago", issue: "Problema", visit: "Visita", delivery: "Entrega", video: "Video",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default async function InboxPage() {
  const sb = await createServerClient();
  const { data: inbox } = await sb.from("obras").select("id").eq("is_inbox", true).maybeSingle();
  const { data: obras } = await sb.from("obras").select("id, name").eq("is_inbox", false).order("name");

  const entries = inbox
    ? (await sb.from("timeline_entries").select("id, type, body_text, occurred_at").eq("obra_id", inbox.id).order("occurred_at", { ascending: false })).data ?? []
    : [];
  const photos = inbox
    ? (await sb.from("photos").select("id, storage_path, timeline_entry_id").eq("obra_id", inbox.id)).data ?? []
    : [];
  const urls = await signedUrls(photos.map((p) => p.storage_path));
  const photosByEntry = new Map<string, string[]>();
  for (const p of photos) {
    if (!p.timeline_entry_id) continue;
    const arr = photosByEntry.get(p.timeline_entry_id) ?? [];
    if (urls[p.storage_path]) arr.push(urls[p.storage_path]);
    photosByEntry.set(p.timeline_entry_id, arr);
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <h1 className="text-3xl">Inbox</h1>
        <span className="font-display text-xs tracking-[0.2em] uppercase text-grey-light">
          {entries.length} sin clasificar
        </span>
      </div>
      <p className="text-grey text-sm mb-8">
        Lo que llegó por WhatsApp y no pude asignar a una obra con certeza. Asignalo en un clic.
      </p>

      {entries.length === 0 ? (
        <div className="border border-rule p-10 text-center text-grey">
          Nada pendiente. Todo lo que mandás se está clasificando bien. 👌
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => (
            <li key={e.id} className="border border-rule p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex gap-2 shrink-0">
                {(photosByEntry.get(e.id) ?? []).slice(0, 3).map((u, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} alt="" className="w-16 h-16 object-cover border border-rule" />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-display text-[0.62rem] tracking-[0.18em] uppercase text-grey-soft">
                  {TYPE_LABEL[e.type] ?? e.type} · {fmt(e.occurred_at)}
                </span>
                <p className="text-sm text-ink truncate">{e.body_text || "—"}</p>
              </div>
              {obras && obras.length > 0 && (
                <form action={moveEntryAction} className="flex items-center gap-2 shrink-0">
                  <input type="hidden" name="entryId" value={e.id} />
                  <select
                    name="obraId"
                    defaultValue=""
                    className="border border-rule bg-bg text-sm py-2 px-2 outline-none focus:border-ink"
                  >
                    <option value="" disabled>Asignar a obra…</option>
                    {obras.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                  <button className="bg-ink text-bg font-display text-xs tracking-wide px-3 py-2">Mover</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
