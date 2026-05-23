import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getNotifications, getCompanyNotifications } from "@/lib/notifications/service";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "NOTIFICATIONS:READ");
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "1";
    const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);
    const offset = Number(searchParams.get("offset") ?? "0");
    const scope = searchParams.get("scope"); // "company" = HR admin view

    if (scope === "company") {
      const data = await getCompanyNotifications(session.companyId, { limit });
      return ok(data);
    }

    if (!session.employeeId) return ok([]);
    const data = await getNotifications(session.employeeId, { unreadOnly, limit, offset });
    return ok(data);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
