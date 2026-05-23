import { NextRequest, NextResponse } from "next/server";
import { drainWebhookQueue } from "@/lib/webhooks/dispatch";

// Called every 5 minutes by Vercel Cron or external scheduler.
// Authorization: Bearer <CRON_SECRET>

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await drainWebhookQueue(200);
    return NextResponse.json({ success: true, result });
  } catch (e) {
    console.error("[Cron/webhooks] drain failed:", e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
