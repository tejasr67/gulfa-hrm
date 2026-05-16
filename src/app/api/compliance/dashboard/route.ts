import { requireSession } from "@/lib/auth/session";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import { getComplianceStats } from "@/modules/compliance/queries";

export async function GET() {
  try {
    const session = await requireSession();
    const stats = await getComplianceStats(session.companyId);
    return ok(stats);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
