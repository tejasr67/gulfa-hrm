import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { changeEmployeeStatus } from "@/modules/employees/queries";
import { writeAuditLog } from "@/lib/utils/audit";
import { statusTransitionSchema } from "@/modules/employees/schema";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:UPDATE");

    const body = await request.json();
    const parsed = statusTransitionSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const employee = await changeEmployeeStatus(
      id,
      session.companyId,
      parsed.data.newStatus,
      parsed.data.notes,
      parsed.data.terminationDate,
      session.userId
    );

    await writeAuditLog({
      userId: session.userId,
      action: "STATUS_CHANGE",
      module: "EMPLOYEES",
      entityId: id,
      entityType: "Employee",
      employeeId: id,
      newValues: { status: parsed.data.newStatus, notes: parsed.data.notes },
    });

    return ok(employee);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message?.startsWith("Cannot transition")) return err(e.message, 422);
    if (e instanceof Error && e.message === "Permission denied") return forbidden();
    return serverError(e);
  }
}
