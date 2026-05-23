import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getAttendanceSummary, getDepartmentAttendanceStats, getAttendanceTrends } from "@/modules/attendance/queries";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:READ");

    const [summary, departments, trends] = await Promise.all([
      getAttendanceSummary(session.companyId),
      getDepartmentAttendanceStats(session.companyId),
      getAttendanceTrends(session.companyId, 14),
    ]);

    return ok({ summary, departments, trends });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
