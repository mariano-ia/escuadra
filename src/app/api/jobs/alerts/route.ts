import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/db/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace(/^Bearer /, "") || new URL(req.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  const admin = createAdminClient();

  // Recalcular alertas automáticas (idempotente: borrar abiertas y regenerar)
  await admin.from("alerts").delete().in("kind", ["quote_expiring", "payment_overdue"]).eq("status", "open");

  const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  const { data: quotes } = await admin
    .from("quotes")
    .select("studio_id, obra_id, valid_until")
    .eq("status", "received")
    .not("valid_until", "is", null)
    .lte("valid_until", soon);
  for (const q of quotes ?? []) {
    await admin.from("alerts").insert({
      studio_id: q.studio_id, obra_id: q.obra_id, kind: "quote_expiring",
      message: `Vence una cotización el ${q.valid_until}`, severity: "media", due_at: q.valid_until,
    });
  }

  const { data: pays } = await admin
    .from("payments")
    .select("studio_id, obra_id, due_date")
    .eq("status", "due")
    .not("due_date", "is", null)
    .lt("due_date", today);
  for (const p of pays ?? []) {
    await admin.from("alerts").insert({
      studio_id: p.studio_id, obra_id: p.obra_id, kind: "payment_overdue",
      message: `Pago vencido (${p.due_date})`, severity: "alta", due_at: p.due_date,
    });
  }

  return NextResponse.json({ ok: true, quotes: (quotes ?? []).length, payments: (pays ?? []).length });
}

export const GET = run;
export const POST = run;
