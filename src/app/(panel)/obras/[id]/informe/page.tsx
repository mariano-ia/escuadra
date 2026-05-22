import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/db/supabase";
import { signedUrls } from "@/lib/storage";
import { ReportBuilder } from "./builder";

export default async function InformePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createServerClient();
  const { data: obra } = await sb.from("obras").select("name").eq("id", id).maybeSingle();
  if (!obra) notFound();

  const { data: photos } = await sb
    .from("photos")
    .select("id, storage_path")
    .eq("obra_id", id)
    .order("created_at", { ascending: false })
    .limit(60);
  const urls = await signedUrls((photos ?? []).map((p) => p.storage_path));
  const items = (photos ?? [])
    .map((p) => ({ id: p.id, url: urls[p.storage_path] }))
    .filter((p) => !!p.url);

  return (
    <div>
      <Link href={`/obras/${id}`} className="font-display text-xs tracking-[0.16em] uppercase text-grey-soft hover:text-ink">
        ← {obra.name}
      </Link>
      <h1 className="text-3xl mt-3 mb-2">Informe al cliente</h1>
      <p className="text-grey mb-8">Elegí las fotos, ponele un título y generá un link para compartir.</p>
      <ReportBuilder obraId={id} photos={items} />
    </div>
  );
}
