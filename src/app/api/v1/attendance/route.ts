import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, requireScope } from "@/lib/api/apikey";
import { writeAuditLog } from "@/lib/utils/audit";
import { enqueueWebhook } from "@/lib/webhooks/dispatch";
import { v1Error } from "@/lib/api/response";

// ── GET /api/v1/attendance ────────────────────────────────────────────────────
// Query: ?employeeId=<id>&dateFrom=ISO&dateTo=ISO&status=PRESENT&cursor=&limit=100

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "attendance:read");

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get("limit") ?? "100", 10), 500);
    const cursor = sp.get("cursor") ?? undefined;
    const employeeId = sp.get("employeeId") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const dateFrom = sp.get("dateFrom") ? new Date(sp.get("dateFrom")!) : undefined;
    const dateTo = sp.get("dateTo") ? new Date(sp.get("dateTo")!) : undefined;

    const records = await prisma.attendanceRecord.findMany({
      where: {
        employee: { companyId: session.companyId, deletedAt: null },
        ...(employeeId ? { employeeId } : {}),
        ...(status ? { status: status as never } : {}),
        ...(dateFrom || dateTo ? {
          date: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        } : {}),
      },
      select: {
        id: true,
        date: true,
        status: true,
        checkIn: true,
        checkOut: true,
        workHours: true,
        overtime: true,
        checkInMethod: true,
        employee: {
          select: { id: true, employeeId: true, firstName: true, lastName: true },
        },
      },
      orderBy: [{ date: "desc" }, { id: "asc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNext = records.length > limit;
    const items = hasNext ? records.slice(0, limit) : records;

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { limit, nextCursor: hasNext ? items.at(-1)?.id : null, hasNext },
    });
  } catch (e) {
    return v1Error(e);
  }
}

// ── POST /api/v1/attendance ───────────────────────────────────────────────────
// Bulk upsert attendance records (e.g. from biometric device feed).
// Upserts by [employeeId, date] — safe to re-send the same day's data.

const recordSchema = z.object({
  employeeId: z.string(),     // internal Employee.id
  date: z.coerce.date(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LATE", "ON_LEAVE", "HOLIDAY", "WEEKEND", "REMOTE"]),
  checkIn: z.coerce.date().optional(),
  checkOut: z.coerce.date().optional(),
  workHours: z.number().min(0).max(24).optional(),
  overtime: z.number().min(0).max(12).optional(),
  checkInMethod: z.enum(["MANUAL", "BIOMETRIC", "MOBILE", "WEB"]).optional(),
  notes: z.string().max(500).optional(),
});

const bulkSchema = z.object({
  records: z.array(recordSchema).min(1).max(500),
});

export async function POST(req: NextRequest) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "attendance:write");

    const body = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 422 });
    }

    // Verify all employeeIds belong to this company
    const employeeIds = [...new Set(parsed.data.records.map((r) => r.employeeId))];
    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds }, companyId: session.companyId, deletedAt: null },
      select: { id: true },
    });
    const validIds = new Set(employees.map((e) => e.id));
    const invalid = employeeIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      return NextResponse.json(
        { success: false, error: `Unknown employee IDs: ${invalid.join(", ")}` },
        { status: 422 }
      );
    }

    let upserted = 0;
    for (const record of parsed.data.records) {
      const dateOnly = new Date(record.date);
      dateOnly.setHours(0, 0, 0, 0);

      await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId: record.employeeId, date: dateOnly } },
        create: {
          employeeId: record.employeeId,
          date: dateOnly,
          status: record.status,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          workHours: record.workHours,
          overtime: record.overtime,
          checkInMethod: record.checkInMethod,
          notes: record.notes,
        },
        update: {
          status: record.status,
          checkIn: record.checkIn,
          checkOut: record.checkOut,
          workHours: record.workHours,
          overtime: record.overtime,
          checkInMethod: record.checkInMethod,
          notes: record.notes,
        },
      });
      upserted++;
    }

    writeAuditLog({
      userId: `apikey:${session.keyId}`,
      action: "BULK_UPSERT",
      module: "ATTENDANCE",
      entityId: session.companyId,
      entityType: "AttendanceRecord",
      newValues: { count: upserted, source: "api_v1" },
    }).catch(() => {});

    enqueueWebhook(session.companyId, "ATTENDANCE_RECORDED", {
      count: upserted,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return NextResponse.json({ success: true, data: { upserted } }, { status: 201 });
  } catch (e) {
    return v1Error(e);
  }
}
