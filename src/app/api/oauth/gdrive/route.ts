import { NextResponse, type NextRequest } from "next/server";
import { getActiveStudio } from "@/lib/auth/session";
import { driveConfigured, getAuthUrl } from "@/lib/cloud/gdrive";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function settings(req: NextRequest, qs: string) {
  const base = process.env.APP_BASE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
  return NextResponse.redirect(`${base}/settings${qs}`);
}

/** Inicia el OAuth de Google Drive: redirige al consentimiento con un `state` cifrado. */
export async function GET(req: NextRequest) {
  if (!driveConfigured()) return settings(req, "?drive=unconfigured");

  const ctx = await getActiveStudio();
  if (!ctx) {
    const base = process.env.APP_BASE_URL?.replace(/\/$/, "") || req.nextUrl.origin;
    return NextResponse.redirect(`${base}/login`);
  }

  // state cifrado (anti-CSRF + ata la conexión al estudio/usuario que la inició)
  const state = encrypt(JSON.stringify({ s: ctx.studio.id, u: ctx.user.id, t: Date.now() }));
  return NextResponse.redirect(getAuthUrl(state));
}
