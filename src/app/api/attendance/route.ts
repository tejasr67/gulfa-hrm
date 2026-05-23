import { type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getAttendanceRecords, createAttendanceRecord } from "@/modules/attendance/queries";
import { attendanceFiltersSchema, createAttendanceSchema } from "@/modules/attendance/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:READ");

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = attendanceFiltersSchema.safeParse(params);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const result = await getAttendanceRecords(session.companyId, parsed.data);
    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:CREATE");

    const body = await req.json().catch(() => ({}));
    const parsed = createAttendanceSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const record = await createAttendanceRecord(session.companyId, parsed.data, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "CREATE",
      module: "ATTENDANCE",
      entityId: record.id,
      entityType: "AttendanceRecord",
      employeeId: parsed.data.employeeId,
      newValues: { date: parsed.data.date, status: parsed.data.status },
    }).catch(() => {});

    return ok({ id: record.id });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
