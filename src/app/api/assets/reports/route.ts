import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getAssetStats, getCategoryBreakdown } from "@/modules/assets/queries";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:READ");
    const [stats, categoryBreakdown] = await Promise.all([
      getAssetStats(session.companyId),
      getCategoryBreakdown(session.companyId),
    ]);
    return ok({ stats, categoryBreakdown });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
