import { NextResponse, type NextRequest } from "next/server";
import { getActiveStudio } from "@/lib/auth/session";
import { driveConfigured, exchangeCode, saveConnection } from "@/lib/cloud/gdrive";
import { decrypt } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function settings(req: NextRequest, qs: string) {
  const base = process.env.APP_BASE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
  return NextResponse.redirect(`${base}/settings${qs}`);
}

/** Callback de Google: canjea el código por tokens y guarda la conexión cifrada. */
export async function GET(req: NextRequest) {
  if (!driveConfigured()) return settings(req, "?drive=unconfigured");

  const sp = req.nextUrl.searchParams;
  if (sp.get("error") || !sp.get("code") || !sp.get("state")) {
    return settings(req, "?drive=error");
  }

  // state: debe descifrar, no haber expirado (15 min) y pertenecer al usuario logueado
  let payload: { s: string; u: string; t: number };
  try {
    payload = JSON.parse(decrypt(sp.get("state")!)) as { s: string; u: string; t: number };
  } catch {
    return settings(req, "?drive=error");
  }
  if (Date.now() - payload.t > 15 * 60 * 1000) return settings(req, "?drive=expired");

  const ctx = await getActiveStudio();
  if (!ctx || ctx.user.id !== payload.u || ctx.studio.id !== payload.s) {
    return settings(req, "?drive=error");
  }

  try {
    const tokens = await exchangeCode(sp.get("code")!);
    await saveConnection(payload.s, payload.u, tokens);
  } catch (e) {
    console.error("[oauth/gdrive] callback", e);
    return settings(req, "?drive=error");
  }

  return settings(req, "?drive=connected");
}
