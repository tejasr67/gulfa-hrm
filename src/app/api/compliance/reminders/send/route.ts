import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import { runDocumentExpiryReminders } from "@/lib/notifications/document-expiry";

// Manual trigger — HR/ADMIN only
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    if (session.role !== "ADMIN" && session.role !== "HR") {
      return unauthorized();
    }

    const result = await runDocumentExpiryReminders(session.companyId);
    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
