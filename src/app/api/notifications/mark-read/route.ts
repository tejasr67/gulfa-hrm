import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { markAsRead, markAllAsRead } from "@/lib/notifications/service";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "NOTIFICATIONS:READ");
    if (!session.employeeId) return err("No employee profile");
    const body = await req.json();

    if (body.all === true) {
      await markAllAsRead(session.employeeId);
      return ok({ marked: "all" });
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      await markAsRead(body.ids, session.employeeId);
      return ok({ marked: body.ids.length });
    }

    return err("Provide ids[] or all:true");
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
