import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getPendingApprovals } from "@/modules/leave/queries";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "LEAVE:APPROVE");
    const requests = await getPendingApprovals(session.companyId, session.userId);
    return ok(requests);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
