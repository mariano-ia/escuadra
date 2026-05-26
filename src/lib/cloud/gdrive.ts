import "server-only";
import { createAdminClient } from "@/lib/db/supabase";
import { encrypt, decrypt } from "@/lib/crypto";

const SCOPE = "https://www.googleapis.com/auth/drive.file";

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
  const rootId = await ensureFolder(tokens.access_token, "Escuadra", null);
  await createAdminClient()
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

/** Sube una foto a la carpeta de la obra dentro de "Escuadra" en el Drive del estudio. Best-effort. */
export async function syncPhotoToDrive(opts: {
  studioId: string;
  obraName: string;
  fileName: string;
  mime: string;
  bytes: Buffer;
}): Promise<void> {
  const conn = await getConnection(opts.studioId);
  if (!conn?.refresh_token_enc) return;
  const token = await refreshAccessToken(decrypt(conn.refresh_token_enc));
  const folder = await ensureFolder(token, opts.obraName || "Sin clasificar", conn.root_folder_id);
  await uploadFile(token, folder, opts.fileName, opts.mime, opts.bytes);
}
