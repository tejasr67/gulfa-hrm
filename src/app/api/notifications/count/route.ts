import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getUnreadCount } from "@/lib/notifications/service";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "NOTIFICATIONS:READ");
    if (!session.employeeId) return ok({ count: 0 });
    const count = await getUnreadCount(session.employeeId);
    return ok({ count });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
