import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getShifts } from "@/modules/attendance/queries";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:READ");
    const shifts = await getShifts(session.companyId);
    return ok(shifts);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
