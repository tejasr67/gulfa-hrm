import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { runDocumentExpiryReminders } from "@/lib/notifications/document-expiry";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "SETTINGS:UPDATE");
    const result = await runDocumentExpiryReminders(session.companyId);
    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
