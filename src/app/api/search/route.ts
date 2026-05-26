import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/db/supabase";
import { getActiveStudio } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ctx = await getActiveStudio();
  if (!ctx) return NextResponse.json({ results: [] }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const obra = url.searchParams.get("obra");
  if (q.length < 2) return NextResponse.json({ results: [] });

  const sb = await createServerClient();
  const { data } = await sb.rpc("universal_search", { target_studio: ctx.studio.id, q });
  let results = (data ?? []) as { kind: string; id: string; obra_id: string; title: string }[];
  if (obra) results = results.filter((r) => r.obra_id === obra);
  return NextResponse.json({ results: results.slice(0, 30) });
}
