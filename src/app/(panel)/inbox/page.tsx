import { createServerClient } from "@/lib/db/supabase";
import { signedUrls } from "@/lib/storage";
import { InboxList, type Entry } from "./inbox-list";
import { SearchClient } from "@/app/(panel)/buscar/search-client";
import { OnboardingChecklist } from "@/components/onboarding-checklist";

export default async function InboxPage() {
  const sb = await createServerClient();
  const { data: obrasAll } = await sb.from("obras").select("id, name, is_inbox").order("name");
  const realObras = (obrasAll ?? []).filter((o) => !o.is_inbox).map((o) => ({ id: o.id, name: o.name }));
  const obraInfo = new Map((obrasAll ?? []).map((o) => [o.id, { name: o.name, is_inbox: o.is_inbox }]));

  const { data: entries } = await sb
    .from("timeline_entries")
    .select("id, type, body_text, occurred_at, obra_id")
    .order("occurred_at", { ascending: false })
    .limit(200);
  const { data: photos } = await sb.from("photos").select("storage_path, timeline_entry_id").limit(400);

  // Estado de activación (para el onboarding de primer uso).
  const { data: waLinks } = await sb.from("whatsapp_links").select("id").eq("status", "active").limit(1);
  const whatsappLinked = (waLinks ?? []).length > 0;
  const hasObras = realObras.length > 0;
  const hasEntries = (entries ?? []).length > 0;

  const urls = await signedUrls((photos ?? []).map((p) => p.storage_path));
  const photosByEntry = new Map<string, string[]>();
  for (const p of photos ?? []) {
    if (!p.timeline_entry_id) continue;
    const a = photosByEntry.get(p.timeline_entry_id) ?? [];
    if (urls[p.storage_path]) a.push(urls[p.storage_path]);
    photosByEntry.set(p.timeline_entry_id, a);
  }

  const items: Entry[] = (entries ?? []).map((e) => ({
    id: e.id,
    type: e.type,
    body: e.body_text,
    occurred_at: e.occurred_at,
    obra_id: e.obra_id,
    obra_name: obraInfo.get(e.obra_id)?.name ?? "—",
    is_inbox: obraInfo.get(e.obra_id)?.is_inbox ?? false,
    photos: photosByEntry.get(e.id) ?? [],
  }));

  return (
    <div>
      <h1 className="text-3xl mb-2">Inbox</h1>
      <p className="text-grey text-sm mb-6">
        Todo lo que llegó por WhatsApp. Asigná en un toque lo que quedó sin clasificar, buscá y filtrá por obra.
      </p>
      <OnboardingChecklist whatsappLinked={whatsappLinked} hasObras={hasObras} hasEntries={hasEntries} />
      <div className="mb-8 max-w-xl">
        <SearchClient autoFocus={false} />
      </div>
      <InboxList entries={items} obras={realObras} />
    </div>
  );
}
