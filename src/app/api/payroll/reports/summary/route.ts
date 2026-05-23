import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getPayrollHistory, getPayrollStats } from "@/modules/payroll/queries";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:VIEW");
    const [stats, history] = await Promise.all([
      getPayrollStats(session.companyId),
      getPayrollHistory(session.companyId),
    ]);
    return ok({ stats, history });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
