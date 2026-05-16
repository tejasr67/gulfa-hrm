import { NextRequest, NextResponse } from "next/server";
import { runDocumentExpiryRemindersAllCompanies } from "@/lib/notifications/document-expiry";

// Called daily by Vercel Cron / external scheduler
// Authorization: Bearer <CRON_SECRET>
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runDocumentExpiryRemindersAllCompanies();
    return NextResponse.json({ success: true, results });
  } catch (e) {
    console.error("[Cron] document-expiry failed:", e);
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
