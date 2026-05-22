import { NextResponse, type NextRequest } from "next/server";
import { claimNextJob, failJob } from "@/lib/jobs/queue";
import { processInbound } from "@/lib/ingest/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function drain(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace(/^Bearer /, "");
  const secret = auth || new URL(req.url).searchParams.get("secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  let processed = 0;
  for (let i = 0; i < 10; i++) {
    const job = await claimNextJob();
    if (!job) break;
    try {
      if (job.inbound_message_id) await processInbound({ jobId: job.id, inboundId: job.inbound_message_id });
    } catch (e) {
      await failJob(job.id, job.attempts, job.max_attempts, String(e));
    }
    processed++;
  }
  return NextResponse.json({ processed });
}

export const POST = drain;
export const GET = drain;
