import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { getEmployeeById, updateEmployee, softDeleteEmployee } from "@/modules/employees/queries";
import { writeAuditLog, serializeForAudit } from "@/lib/utils/audit";
import { updateEmployeeSchema } from "@/modules/employees/schema";
import { ok, unauthorized, notFound, forbidden, serverError, err } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const employee = await getEmployeeById(id, session.companyId);
    if (!employee) return notFound("Employee");
    return ok(employee);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:UPDATE");

    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const before = await prisma.employee.findFirst({ where: { id, companyId: session.companyId } });
    if (!before) return notFound("Employee");

    const employee = await updateEmployee(id, session.companyId, parsed.data, session.userId);

    await writeAuditLog({
      userId: session.userId,
      action: "UPDATE",
      module: "EMPLOYEES",
      entityId: id,
      entityType: "Employee",
      employeeId: id,
      oldValues: serializeForAudit(before as unknown as Record<string, unknown>),
      newValues: serializeForAudit(parsed.data as Record<string, unknown>),
    });

    return ok(employee);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Permission denied") return forbidden();
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:DELETE");

    const existing = await prisma.employee.findFirst({ where: { id, companyId: session.companyId } });
    if (!existing) return notFound("Employee");

    await softDeleteEmployee(id, session.companyId);

    await writeAuditLog({
      userId: session.userId,
      action: "DELETE",
      module: "EMPLOYEES",
      entityId: id,
      entityType: "Employee",
      employeeId: id,
    });

    return ok(null, 200);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Permission denied") return forbidden();
    return serverError(e);
  }
}
