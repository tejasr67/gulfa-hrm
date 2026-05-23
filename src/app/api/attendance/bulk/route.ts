import { type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { bulkCreateAttendance } from "@/modules/attendance/queries";
import { bulkAttendanceSchema } from "@/modules/attendance/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:CREATE");

    const body = await req.json().catch(() => ({}));
    const parsed = bulkAttendanceSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const result = await bulkCreateAttendance(session.companyId, parsed.data.records);
    await writeAuditLog({
      userId: session.userId,
      action: "BULK_IMPORT",
      module: "ATTENDANCE",
      entityId: session.companyId,
      entityType: "AttendanceRecord",
      newValues: result,
    }).catch(() => {});

    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
