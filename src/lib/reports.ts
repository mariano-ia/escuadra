import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/db/supabase";

/** Token público inadivinable (24 bytes, no UUID). */
export function reportToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createReport(opts: {
  studioId: string;
  obraId: string;
  userId: string;
  title: string;
  note: string | null;
  photoIds: string[];
  expiresDays?: number;
}): Promise<string> {
  const admin = createAdminClient();
  const token = reportToken();
  const { data: report, error } = await admin
    .from("reports")
    .insert({
      studio_id: opts.studioId,
      obra_id: opts.obraId,
      title: opts.title,
      note: opts.note,
      public_token: token,
      created_by_user_id: opts.userId,
      expires_at: new Date(Date.now() + (opts.expiresDays ?? 60) * 86400000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !report) throw error ?? new Error("No se pudo crear el informe");

  if (opts.photoIds.length) {
    await admin.from("report_photos").insert(
      opts.photoIds.map((pid, i) => ({
        studio_id: opts.studioId,
        report_id: report.id,
        photo_id: pid,
        sort_order: i,
      })),
    );
  }
  return token;
}

export type PublicReport = {
  id: string;
  studio_id: string;
  title: string | null;
  note: string | null;
  created_at: string;
  obraName: string | null;
  studioName: string | null;
  photoPaths: string[];
};

export async function getPublicReport(token: string): Promise<PublicReport | null> {
  const admin = createAdminClient();
  const { data: report } = await admin
    .from("reports")
    .select("id, studio_id, title, note, created_at, is_active, revoked_at, expires_at, obras(name), studios(name)")
    .eq("public_token", token)
    .maybeSingle();
  if (!report || !report.is_active || report.revoked_at) return null;
  if (report.expires_at && new Date(report.expires_at).getTime() < Date.now()) return null;

  const { data: rp } = await admin
    .from("report_photos")
    .select("sort_order, photos(storage_path)")
    .eq("report_id", report.id)
    .order("sort_order", { ascending: true });

  const obra = report.obras as { name: string } | null;
  const studio = report.studios as { name: string } | null;
  const photoPaths = (rp ?? [])
    .map((r) => (r.photos as { storage_path: string } | null)?.storage_path)
    .filter((p): p is string => !!p);

  return {
    id: report.id,
    studio_id: report.studio_id,
    title: report.title,
    note: report.note,
    created_at: report.created_at,
    obraName: obra?.name ?? null,
    studioName: studio?.name ?? null,
    photoPaths,
  };
}

/** Registra una vista (best-effort) e incrementa el contador. */
export async function trackView(reportId: string, studioId: string, viewerHash: string): Promise<void> {
  const admin = createAdminClient();
  try {
    await admin.from("report_views").insert({ report_id: reportId, studio_id: studioId, viewer_hash: viewerHash });
    const { data } = await admin.from("reports").select("view_count").eq("id", reportId).maybeSingle();
    await admin
      .from("reports")
      .update({ view_count: (data?.view_count ?? 0) + 1, last_viewed_at: new Date().toISOString() })
      .eq("id", reportId);
  } catch {
    /* advisory */
  }
}
