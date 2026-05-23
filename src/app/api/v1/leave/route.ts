import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, requireScope } from "@/lib/api/apikey";
import { writeAuditLog } from "@/lib/utils/audit";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import { v1Error } from "@/lib/api/response";

// ── GET /api/v1/leave ─────────────────────────────────────────────────────────
// Query: ?employeeId=&status=PENDING&dateFrom=&dateTo=&cursor=&limit=50

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "leave:read");

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10), 200);
    const cursor = sp.get("cursor") ?? undefined;
    const employeeId = sp.get("employeeId") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const dateFrom = sp.get("dateFrom") ? new Date(sp.get("dateFrom")!) : undefined;
    const dateTo = sp.get("dateTo") ? new Date(sp.get("dateTo")!) : undefined;

    const requests = await prisma.leaveRequest.findMany({
      where: {
        employee: { companyId: session.companyId, deletedAt: null },
        ...(employeeId ? { employeeId } : {}),
        ...(status ? { status: status as never } : {}),
        ...(dateFrom || dateTo ? {
          startDate: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        } : {}),
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        totalDays: true,
        status: true,
        reason: true,
        approvedAt: true,
        createdAt: true,
        employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } },
        leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNext = requests.length > limit;
    const items = hasNext ? requests.slice(0, limit) : requests;

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { limit, nextCursor: hasNext ? items.at(-1)?.id : null, hasNext },
    });
  } catch (e) {
    return v1Error(e);
  }
}

// ── POST /api/v1/leave ────────────────────────────────────────────────────────
// Create a leave request on behalf of an employee (e.g. from an external portal).

const createSchema = z.object({
  employeeId: z.string(),       // internal Employee.id
  leaveTypeId: z.string().cuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  totalDays: z.number().min(0.5).max(365),
  reason: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "leave:write");

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
    }

    // Verify employee belongs to company
    const employee = await prisma.employee.findFirst({
      where: { id: parsed.data.employeeId, companyId: session.companyId, deletedAt: null },
    });
    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 });
    }

    // Verify leave type belongs to company
    const leaveType = await prisma.leaveType.findFirst({
      where: { id: parsed.data.leaveTypeId, companyId: session.companyId, isActive: true },
    });
    if (!leaveType) {
      return NextResponse.json({ success: false, error: "Leave type not found" }, { status: 404 });
    }

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: parsed.data.employeeId,
        leaveTypeId: parsed.data.leaveTypeId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        totalDays: parsed.data.totalDays,
        reason: parsed.data.reason,
        status: "PENDING",
      },
    });

    writeAuditLog({
      userId: `apikey:${session.keyId}`,
      action: "CREATE",
      module: "LEAVE",
      entityId: request.id,
      entityType: "LeaveRequest",
      employeeId: parsed.data.employeeId,
      newValues: { source: "api_v1", leaveTypeId: parsed.data.leaveTypeId },
    }).catch(() => {});

    enqueueWebhook(session.companyId, "LEAVE_REQUESTED", {
      requestId: request.id,
      employeeId: parsed.data.employeeId,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.json({ success: true, data: { id: request.id, status: request.status } }, { status: 201 });
  } catch (e) {
    return v1Error(e);
  }
}
