import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getComplianceStats } from "@/modules/compliance/queries";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:READ");
    const stats = await getComplianceStats(session.companyId);
    return ok(stats);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
