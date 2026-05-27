import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "crypto";
import type { Metadata } from "next";
import { getPublicReport, trackView } from "@/lib/reports";
import { signedUrls } from "@/lib/storage";
import { ZoomImage } from "@/components/zoom-image";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getPublicReport(token);
  if (!data) notFound();

  const urls = await signedUrls(data.photos.map((p) => p.path));

  // Vista (best-effort, deduplicada por ip+ua+día)
  const h = await headers();
  const viewerHash = createHash("sha256")
    .update((h.get("x-forwarded-for") ?? "") + (h.get("user-agent") ?? "") + new Date().toDateString())
    .digest("hex");
  await trackView(data.id, data.studio_id, viewerHash);

  const fecha = new Date(data.created_at).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-rule">
        <div className="max-w-3xl mx-auto px-6 py-8">
          {data.studioLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.studioLogoUrl} alt={data.studioName ?? ""} className="h-10 object-contain mb-1" />
          ) : (
            <p className="font-display text-xs tracking-[0.3em] uppercase text-grey-soft">{data.studioName ?? "Escuadra"}</p>
          )}
          <h1 className="text-3xl mt-3">{data.title ?? "Avance de obra"}</h1>
          <p className="text-grey mt-1">
            {data.obraName ? `${data.obraName} · ` : ""}
            {fecha}
          </p>
          {data.note && (
            <div className="text-grey mt-4 max-w-prose prose-note" dangerouslySetInnerHTML={{ __html: data.note }} />
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-5">
        {data.photos.map((p, i) =>
          urls[p.path] ? (
            <figure key={i} className="space-y-1.5">
              <ZoomImage src={urls[p.path]} alt={p.caption ?? ""} className="w-full aspect-square border border-rule" />
              {p.caption && <figcaption className="text-xs text-grey leading-snug">{p.caption}</figcaption>}
            </figure>
          ) : null,
        )}
      </div>

      <footer className="max-w-3xl mx-auto px-6 py-10 border-t border-rule">
        <p className="font-display text-xs tracking-[0.3em] uppercase text-grey-light">
          Hecho con Escuadra
        </p>
      </footer>
    </main>
  );
}
