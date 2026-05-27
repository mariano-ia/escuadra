import "server-only";
import { createAdminClient } from "@/lib/db/supabase";
import { downloadMedia } from "@/lib/storage";
import { encrypt, decrypt } from "@/lib/crypto";

const SCOPE = "https://www.googleapis.com/auth/drive.file";

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
};
const mimeFromPath = (p: string) => MIME_BY_EXT[(p.split(".").pop() ?? "").toLowerCase()] ?? "image/jpeg";

function cfg() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirect =
    process.env.GOOGLE_OAUTH_REDIRECT_URI || `${process.env.APP_BASE_URL ?? ""}/api/oauth/gdrive/callback`;
  return { id, secret, redirect };
}

export function driveConfigured(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function getAuthUrl(state: string): string {
  const { id, redirect } = cfg();
  const p = new URLSearchParams({
    client_id: id!,
    redirect_uri: redirect!,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export async function exchangeCode(code: string): Promise<{ access_token: string; refresh_token?: string }> {
  const { id, secret, redirect } = cfg();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: id!,
      client_secret: secret!,
      redirect_uri: redirect!,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("google token exchange " + res.status);
  return (await res.json()) as { access_token: string; refresh_token?: string };
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { id, secret } = cfg();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: id!,
      client_secret: secret!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("google refresh " + res.status);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function ensureFolder(accessToken: string, name: string, parent: string | null): Promise<string> {
  const safe = name.replace(/'/g, "\\'");
  const q = `name='${safe}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parent ? ` and '${parent}' in parents` : ""}`;
  const list = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const lj = (await list.json()) as { files?: { id: string }[] };
  if (lj.files?.[0]) return lj.files[0].id;
  const create = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: parent ? [parent] : undefined }),
  });
  const cj = (await create.json()) as { id: string };
  return cj.id;
}

async function uploadFile(accessToken: string, folderId: string, name: string, mime: string, bytes: Buffer): Promise<void> {
  const boundary = "escuadra" + Date.now();
  const meta = JSON.stringify({ name, parents: [folderId] });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error("google drive upload " + res.status);
}

type Conn = { refresh_token_enc: string | null; root_folder_id: string | null };

/** Guarda la conexión (tokens cifrados) y crea la carpeta raíz "Escuadra" en el Drive del usuario. */
export async function saveConnection(
  studioId: string,
  userId: string,
  tokens: { access_token: string; refresh_token?: string },
): Promise<void> {
  const admin = createAdminClient();
  const prev = await getConnection(studioId);
  const rootId = await ensureFolder(tokens.access_token, "Escuadra", null);
  await admin
    .from("cloud_sync_connections")
    .upsert(
      {
        studio_id: studioId,
        provider: "gdrive",
        access_token_enc: encrypt(tokens.access_token),
        refresh_token_enc: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        root_folder_id: rootId,
        status: "active",
        connected_by: userId,
      },
      { onConflict: "studio_id,provider" },
    );
  // Si cambió la cuenta/carpeta de Drive (root distinto), marcar todo como NO sincronizado
  // para que el backfill suba las fotos al Drive nuevo. Si es el mismo Drive, no se toca (evita duplicados).
  if (prev && prev.root_folder_id && prev.root_folder_id !== rootId) {
    await admin.from("photos").update({ drive_synced_at: null }).eq("studio_id", studioId);
  }
}

export async function getConnection(studioId: string): Promise<Conn | null> {
  const { data } = await createAdminClient()
    .from("cloud_sync_connections")
    .select("refresh_token_enc, root_folder_id")
    .eq("studio_id", studioId)
    .eq("provider", "gdrive")
    .eq("status", "active")
    .maybeSingle();
  return data;
}

/** Cuántas fotos del estudio faltan subir a Drive (drive_synced_at null). 0 si no hay conexión. */
export async function pendingDriveCount(studioId: string): Promise<number> {
  const conn = await getConnection(studioId);
  if (!conn?.refresh_token_enc) return 0;
  const { count } = await createAdminClient()
    .from("photos").select("id", { count: "exact", head: true })
    .eq("studio_id", studioId).is("drive_synced_at", null);
  return count ?? 0;
}

/**
 * Sube a Drive las fotos pendientes (drive_synced_at null) de un estudio, en lotes.
 * Cada foto se sube a la carpeta de su obra dentro de "Escuadra" y se marca como sincronizada
 * (idempotente: no re-sube). Best-effort por foto. Lo usa la ingesta (lote chico, recientes
 * primero) y el botón "Sincronizar" de Configuración (backfill, viejas primero).
 */
export async function syncPendingPhotos(
  studioId: string,
  opts?: { limit?: number; oldestFirst?: boolean },
): Promise<{ synced: number; remaining: number }> {
  const conn = await getConnection(studioId);
  if (!conn?.refresh_token_enc) return { synced: 0, remaining: 0 };
  const admin = createAdminClient();
  const { data: pend } = await admin
    .from("photos")
    .select("id, storage_path, obras(name)")
    .eq("studio_id", studioId)
    .is("drive_synced_at", null)
    .order("created_at", { ascending: opts?.oldestFirst ?? false })
    .limit(opts?.limit ?? 12);
  if (!pend?.length) return { synced: 0, remaining: 0 };

  const token = await refreshAccessToken(decrypt(conn.refresh_token_enc));
  const folderCache = new Map<string, string>();
  let synced = 0;
  for (const p of pend) {
    try {
      const obraName = (p.obras as { name: string } | null)?.name || "Sin clasificar";
      let folderId = folderCache.get(obraName);
      if (!folderId) {
        folderId = await ensureFolder(token, obraName, conn.root_folder_id);
        folderCache.set(obraName, folderId);
      }
      const bytes = await downloadMedia(p.storage_path);
      const fileName = p.storage_path.split("/").pop() || `${p.id}.jpg`;
      await uploadFile(token, folderId, fileName, mimeFromPath(p.storage_path), bytes);
      await admin.from("photos").update({ drive_synced_at: new Date().toISOString() }).eq("id", p.id);
      synced++;
    } catch (e) {
      console.error("[drive] sync photo falló", p.id, e);
    }
  }
  return { synced, remaining: await pendingDriveCount(studioId) };
}
