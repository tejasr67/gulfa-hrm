import { type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getAttendanceTrends } from "@/modules/attendance/queries";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:READ");
    const days = Number(req.nextUrl.searchParams.get("days") ?? "30");
    const trends = await getAttendanceTrends(session.companyId, Math.min(days, 90));
    return ok(trends);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
