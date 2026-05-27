import "server-only";
import { createAdminClient } from "@/lib/db/supabase";

const BUCKET = "obra-media";

/** Sube bytes al bucket privado bajo el prefijo del estudio. Devuelve el path completo. */
export async function uploadMedia(opts: {
  studioId: string;
  subpath: string; // ej. "obraId/uuid.jpg" o "inbox/uuid.ogg"
  bytes: Buffer | Uint8Array;
  contentType: string;
}): Promise<string> {
  const admin = createAdminClient();
  const full = `${opts.studioId}/${opts.subpath}`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(full, opts.bytes, { contentType: opts.contentType, upsert: false });
  if (error) throw error;
  return full;
}

/** Descarga los bytes de un objeto del bucket (server-only). Para re-subir a Drive, etc. */
export async function downloadMedia(path: string): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).download(path);
  if (error || !data) throw error ?? new Error("no se pudo descargar " + path);
  return Buffer.from(await data.arrayBuffer());
}

/** URL firmada de corta duración (server-only). Buckets son privados. */
export async function signedUrl(path: string, expiresInSec = 3600): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

/** URLs firmadas en lote (para galerías/informes). */
export async function signedUrls(paths: string[], expiresInSec = 3600): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrls(paths, expiresInSec);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}
