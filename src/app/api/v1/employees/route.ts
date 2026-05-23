import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, requireScope } from "@/lib/api/apikey";
import { writeAuditLog } from "@/lib/utils/audit";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import { v1Error } from "@/lib/api/response";

// ── GET /api/v1/employees ─────────────────────────────────────────────────────
// Query: ?cursor=<id>&limit=50&status=ACTIVE&departmentId=...&updatedAfter=ISO

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "employees:read");

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10), 200);
    const cursor = sp.get("cursor") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const departmentId = sp.get("departmentId") ?? undefined;
    const updatedAfter = sp.get("updatedAfter") ? new Date(sp.get("updatedAfter")!) : undefined;

    const employees = await prisma.employee.findMany({
      where: {
        companyId: session.companyId,
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(updatedAfter ? { updatedAt: { gt: updatedAfter } } : {}),
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        employmentType: true,
        nationality: true,
        gender: true,
        joiningDate: true,
        terminationDate: true,
        updatedAt: true,
        department: { select: { id: true, name: true } },
        position: { select: { id: true, title: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { id: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNext = employees.length > limit;
    const items = hasNext ? employees.slice(0, limit) : employees;
    const nextCursor = hasNext ? items.at(-1)?.id : null;

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { limit, nextCursor, hasNext },
    });
  } catch (e) {
    return v1Error(e);
  }
}

// ── POST /api/v1/employees ────────────────────────────────────────────────────
// Upsert by employeeId (your system's unique identifier).
// Triggers EMPLOYEE_CREATED or EMPLOYEE_UPDATED webhook.

const upsertSchema = z.object({
  employeeId: z.string().min(1).max(50),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  nationality: z.string().max(50).optional(),
  joiningDate: z.coerce.date(),
  departmentId: z.string().cuid().optional(),
  positionId: z.string().cuid().optional(),
  locationId: z.string().cuid().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "FREELANCE"]).optional(),
  status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "PROBATION"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "employees:write");

    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
    }

    const { employeeId, ...fields } = parsed.data;

    const existing = await prisma.employee.findFirst({
      where: { employeeId, companyId: session.companyId, deletedAt: null },
    });

    let employee;
    let isNew = false;

    if (existing) {
      employee = await prisma.employee.update({
        where: { id: existing.id },
        data: fields,
      });
    } else {
      isNew = true;
      employee = await prisma.employee.create({
        data: { companyId: session.companyId, employeeId, ...fields },
      });
    }

    writeAuditLog({
      userId: `apikey:${session.keyId}`,
      action: isNew ? "CREATE" : "UPDATE",
      module: "EMPLOYEES",
      entityId: employee.id,
      entityType: "Employee",
      employeeId: employee.id,
      newValues: { source: "api_v1", employeeId },
    }).catch(() => {});

    enqueueWebhook(
      session.companyId,
      isNew ? "EMPLOYEE_CREATED" : "EMPLOYEE_UPDATED",
      { employeeId: employee.id, externalId: employeeId, timestamp: new Date().toISOString() }
    ).catch(() => {});

    return NextResponse.json({ success: true, data: { id: employee.id, employeeId } }, { status: isNew ? 201 : 200 });
  } catch (e) {
    return v1Error(e);
  }
}
