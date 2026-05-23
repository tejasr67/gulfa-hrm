import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, requireScope } from "@/lib/api/apikey";
import { writeAuditLog } from "@/lib/utils/audit";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import { v1Error } from "@/lib/api/response";

type Params = { params: Promise<{ id: string }> };

// ── GET /api/v1/employees/:id ─────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "employees:read");
    const { id } = await params;

    const employee = await prisma.employee.findFirst({
      where: { id, companyId: session.companyId, deletedAt: null },
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        location: { select: { id: true, name: true } },
        manager: { select: { id: true, employeeId: true, firstName: true, lastName: true } },
        salaries: { where: { isActive: true }, select: { basicSalary: true, totalSalary: true, currency: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: employee });
  } catch (e) {
    return v1Error(e);
  }
}

// ── PATCH /api/v1/employees/:id ───────────────────────────────────────────────

const patchSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "PROBATION"]).optional(),
  departmentId: z.string().cuid().optional(),
  positionId: z.string().cuid().optional(),
  terminationDate: z.coerce.date().optional(),
}).strict();

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "employees:write");
    const { id } = await params;

    const existing = await prisma.employee.findFirst({
      where: { id, companyId: session.companyId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: parsed.data,
    });

    const isTermination = parsed.data.status === "TERMINATED";

    writeAuditLog({
      userId: `apikey:${session.keyId}`,
      action: isTermination ? "TERMINATE" : "UPDATE",
      module: "EMPLOYEES",
      entityId: id,
      entityType: "Employee",
      employeeId: id,
      oldValues: { status: existing.status },
      newValues: parsed.data as Record<string, unknown>,
    }).catch(() => {});

    enqueueWebhook(
      session.companyId,
      isTermination ? "EMPLOYEE_TERMINATED" : "EMPLOYEE_UPDATED",
      { employeeId: id, timestamp: new Date().toISOString() }
    ).catch(() => {});

    return NextResponse.json({ success: true, data: { id: employee.id } });
  } catch (e) {
    return v1Error(e);
  }
}
