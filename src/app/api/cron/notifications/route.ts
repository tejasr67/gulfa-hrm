import { NextRequest, NextResponse } from "next/server";
import { drainEmailQueue } from "@/lib/notifications/service";
import { runProbationRemindersAllCompanies } from "@/lib/notifications/triggers/probation";
import { runDocumentExpiryRemindersAllCompanies } from "@/lib/notifications/document-expiry";

// Called daily by Vercel Cron or external scheduler
// Authorization: Bearer <CRON_SECRET>
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    results.emailQueue = await drainEmailQueue(100);
  } catch (e) {
    results.emailQueueError = String(e);
    console.error("[Cron/notifications] email queue drain failed:", e);
  }

  try {
    results.probation = await runProbationRemindersAllCompanies();
  } catch (e) {
    results.probationError = String(e);
    console.error("[Cron/notifications] probation check failed:", e);
  }

  try {
    results.documentExpiry = await runDocumentExpiryRemindersAllCompanies();
  } catch (e) {
    results.documentExpiryError = String(e);
    console.error("[Cron/notifications] document expiry check failed:", e);
  }

  return NextResponse.json({ success: true, results });
}
