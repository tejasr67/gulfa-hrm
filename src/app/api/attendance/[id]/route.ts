import { type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, notFound, serverError } from "@/lib/api/response";
import { getAttendanceRecordById, updateAttendanceRecord, approveOvertime } from "@/modules/attendance/queries";
import { updateAttendanceSchema } from "@/modules/attendance/schema";
import { writeAuditLog } from "@/lib/utils/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:READ");
    const { id } = await params;
    const record = await getAttendanceRecordById(id, session.companyId);
    if (!record) return notFound("Attendance record");
    return ok(record);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    if (body.action === "approve-overtime") {
      await requirePermission(session, "ATTENDANCE:APPROVE");
      await approveOvertime(id, session.companyId, session.userId);
      await writeAuditLog({
        userId: session.userId,
        action: "APPROVE",
        module: "ATTENDANCE",
        entityId: id,
        entityType: "AttendanceRecord",
      }).catch(() => {});
      return ok(null);
    }

    await requirePermission(session, "ATTENDANCE:UPDATE");
    const parsed = updateAttendanceSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const record = await updateAttendanceRecord(id, session.companyId, parsed.data);
    await writeAuditLog({
      userId: session.userId,
      action: "UPDATE",
      module: "ATTENDANCE",
      entityId: id,
      entityType: "AttendanceRecord",
      newValues: parsed.data,
    }).catch(() => {});

    return ok(record);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error && e.message === "Attendance record not found") return notFound("Attendance record");
    return serverError(e);
  }
}
