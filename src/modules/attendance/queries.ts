import "server-only";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import type { AttendanceFilters, AttendanceSummary, DepartmentAttendanceStat, AttendanceTrend } from "./types";

const employeeSelect = {
  id: true,
  firstName: true,
  lastName: true,
  photo: true,
  employeeId: true,
  department: { select: { name: true } },
  position: { select: { title: true } },
} as const;

// ─── Records ─────────────────────────────────────────────────────────────────

export async function getAttendanceRecords(companyId: string, filters: AttendanceFilters = {}) {
  const {
    search,
    status,
    employeeId,
    departmentId,
    shiftId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
  } = filters;

  const dateFrom = startDate ? startOfDay(startDate) : startOfDay(startOfMonth(new Date()));
  const dateTo = endDate ? endOfDay(endDate) : endOfDay(endOfMonth(new Date()));

  const where = {
    employee: {
      companyId,
      deletedAt: null,
      ...(employeeId && { id: employeeId }),
      ...(departmentId && { departmentId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { lastName: { contains: search, mode: "insensitive" as const } },
          { employeeId: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    },
    date: { gte: dateFrom, lte: dateTo },
    ...(status && { status }),
    ...(shiftId && { shiftId }),
  };

  const [total, records] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: { select: employeeSelect },
        shift: { select: { id: true, name: true, startTime: true, endTime: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return { data: records, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getAttendanceRecordById(id: string, companyId: string) {
  return prisma.attendanceRecord.findFirst({
    where: { id, employee: { companyId } },
    include: {
      employee: { select: employeeSelect },
      shift: { select: { id: true, name: true, startTime: true, endTime: true } },
    },
  });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getTodayStats(companyId: string): Promise<AttendanceSummary["today"]> {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const [totalEmployees, records] = await Promise.all([
    prisma.employee.count({ where: { companyId, deletedAt: null } }),
    prisma.attendanceRecord.findMany({
      where: {
        employee: { companyId, deletedAt: null },
        date: { gte: dayStart, lte: dayEnd },
      },
      select: { status: true, overtime: true },
    }),
  ]);

  const counts = { present: 0, absent: 0, late: 0, halfDay: 0, onLeave: 0, remote: 0, holiday: 0, weekend: 0 };
  let totalOvertimeHours = 0;

  for (const r of records) {
    if (r.status === "PRESENT") counts.present++;
    else if (r.status === "ABSENT") counts.absent++;
    else if (r.status === "LATE") counts.late++;
    else if (r.status === "HALF_DAY") counts.halfDay++;
    else if (r.status === "ON_LEAVE") counts.onLeave++;
    else if (r.status === "REMOTE") counts.remote++;
    else if (r.status === "HOLIDAY") counts.holiday++;
    else if (r.status === "WEEKEND") counts.weekend++;
    if (r.overtime) totalOvertimeHours += r.overtime;
  }

  const attended = counts.present + counts.late + counts.remote + counts.halfDay;
  const attendanceRate = totalEmployees > 0 ? Math.round((attended / totalEmployees) * 100) : 0;

  return { ...counts, totalEmployees, attendanceRate, totalOvertimeHours };
}

export async function getAttendanceSummary(companyId: string): Promise<AttendanceSummary> {
  const today = getTodayStats(companyId);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthRecords = prisma.attendanceRecord.findMany({
    where: {
      employee: { companyId, deletedAt: null },
      date: { gte: monthStart, lte: monthEnd },
    },
    select: { status: true, overtime: true, date: true },
  });

  const [todayData, monthData] = await Promise.all([today, monthRecords]);

  const uniqueDates = new Set(monthData.map((r) => r.date.toISOString().split("T")[0]));
  const totalWorkDays = uniqueDates.size;

  let totalPresent = 0;
  let totalRecords = 0;
  let totalOvertimeHours = 0;
  let totalAbsences = 0;

  for (const r of monthData) {
    totalRecords++;
    if (["PRESENT", "LATE", "REMOTE", "HALF_DAY"].includes(r.status)) totalPresent++;
    if (r.status === "ABSENT") totalAbsences++;
    if (r.overtime) totalOvertimeHours += r.overtime;
  }

  const avgAttendanceRate = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0;

  return {
    today: todayData,
    thisMonth: { totalWorkDays, avgAttendanceRate, totalOvertimeHours, totalAbsences },
  };
}

export async function getDepartmentAttendanceStats(companyId: string): Promise<DepartmentAttendanceStat[]> {
  const today = new Date();
  const dayStart = startOfDay(today);
  const dayEnd = endOfDay(today);

  const records = await prisma.attendanceRecord.findMany({
    where: {
      employee: { companyId, deletedAt: null },
      date: { gte: dayStart, lte: dayEnd },
    },
    include: {
      employee: { select: { department: { select: { id: true, name: true } } } },
    },
  });

  const deptMap = new Map<string, { id: string; name: string; present: number; absent: number; late: number; total: number }>();

  for (const r of records) {
    const dept = r.employee.department;
    if (!dept) continue;
    const key = dept.id;
    if (!deptMap.has(key)) {
      deptMap.set(key, { id: dept.id, name: dept.name, present: 0, absent: 0, late: 0, total: 0 });
    }
    const d = deptMap.get(key)!;
    d.total++;
    if (r.status === "PRESENT" || r.status === "REMOTE") d.present++;
    else if (r.status === "ABSENT") d.absent++;
    else if (r.status === "LATE") d.late++;
  }

  return Array.from(deptMap.values()).map((d) => ({
    departmentId: d.id,
    departmentName: d.name,
    present: d.present,
    absent: d.absent,
    late: d.late,
    total: d.total,
    attendanceRate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
  }));
}

export async function getAttendanceTrends(companyId: string, days = 30): Promise<AttendanceTrend[]> {
  const end = endOfDay(new Date());
  const start = startOfDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

  const records = await prisma.attendanceRecord.findMany({
    where: {
      employee: { companyId, deletedAt: null },
      date: { gte: start, lte: end },
    },
    select: { date: true, status: true, overtime: true },
    orderBy: { date: "asc" },
  });

  const dayMap = new Map<string, AttendanceTrend>();

  for (const r of records) {
    const key = r.date.toISOString().split("T")[0];
    if (!dayMap.has(key)) {
      dayMap.set(key, { date: key, present: 0, absent: 0, late: 0, overtimeHours: 0 });
    }
    const d = dayMap.get(key)!;
    if (r.status === "PRESENT" || r.status === "REMOTE") d.present++;
    else if (r.status === "ABSENT") d.absent++;
    else if (r.status === "LATE") d.late++;
    if (r.overtime) d.overtimeHours += r.overtime;
  }

  return Array.from(dayMap.values());
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

export async function getShifts(companyId: string) {
  return prisma.shiftSchedule.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });
}

// ─── Employee list (for attendance entry selectors) ───────────────────────────

export async function getEmployeesForAttendance(companyId: string) {
  return prisma.employee.findMany({
    where: { companyId, deletedAt: null, status: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true, employeeId: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

// ─── Attendance Policy ────────────────────────────────────────────────────────

export async function getAttendancePolicy(companyId: string) {
  return prisma.attendancePolicy.findFirst({
    where: { companyId, isDefault: true, isActive: true },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createAttendanceRecord(
  companyId: string,
  data: {
    employeeId: string;
    date: Date;
    status: string;
    checkIn?: string | null;
    checkOut?: string | null;
    shiftId?: string | null;
    notes?: string | null;
    workHours?: number | null;
    overtime?: number | null;
  },
  createdById: string
) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, companyId, deletedAt: null },
    select: { id: true },
  });
  if (!employee) throw new Error("Employee not found");

  return prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: data.employeeId, date: data.date } },
      create: {
        employeeId: data.employeeId,
        date: data.date,
        status: data.status as never,
        checkIn: data.checkIn ? new Date(`${data.date.toISOString().split("T")[0]}T${data.checkIn}`) : null,
        checkOut: data.checkOut ? new Date(`${data.date.toISOString().split("T")[0]}T${data.checkOut}`) : null,
        shiftId: data.shiftId ?? null,
        notes: data.notes ?? null,
        workHours: data.workHours ?? null,
        overtime: data.overtime ?? null,
        checkInMethod: "MANUAL",
      },
      update: {
        status: data.status as never,
        checkIn: data.checkIn ? new Date(`${data.date.toISOString().split("T")[0]}T${data.checkIn}`) : null,
        checkOut: data.checkOut ? new Date(`${data.date.toISOString().split("T")[0]}T${data.checkOut}`) : null,
        shiftId: data.shiftId ?? null,
        notes: data.notes ?? null,
        workHours: data.workHours ?? null,
        overtime: data.overtime ?? null,
        checkInMethod: "MANUAL",
      },
    });
    return record;
  });
}

export async function updateAttendanceRecord(
  id: string,
  companyId: string,
  data: {
    status?: string;
    checkIn?: string | null;
    checkOut?: string | null;
    shiftId?: string | null;
    notes?: string | null;
    workHours?: number | null;
    overtime?: number | null;
  }
) {
  const existing = await prisma.attendanceRecord.findFirst({
    where: { id, employee: { companyId } },
    select: { id: true, date: true },
  });
  if (!existing) throw new Error("Attendance record not found");

  const dateStr = existing.date.toISOString().split("T")[0];

  return prisma.attendanceRecord.update({
    where: { id },
    data: {
      ...(data.status && { status: data.status as never }),
      checkIn: data.checkIn !== undefined ? (data.checkIn ? new Date(`${dateStr}T${data.checkIn}`) : null) : undefined,
      checkOut: data.checkOut !== undefined ? (data.checkOut ? new Date(`${dateStr}T${data.checkOut}`) : null) : undefined,
      ...(data.shiftId !== undefined && { shiftId: data.shiftId }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.workHours !== undefined && { workHours: data.workHours }),
      ...(data.overtime !== undefined && { overtime: data.overtime }),
    },
  });
}

export async function approveOvertime(id: string, companyId: string, approvedBy: string) {
  const existing = await prisma.attendanceRecord.findFirst({
    where: { id, employee: { companyId } },
    select: { id: true },
  });
  if (!existing) throw new Error("Attendance record not found");

  return prisma.attendanceRecord.update({
    where: { id },
    data: { approvedBy },
  });
}

export async function bulkCreateAttendance(
  companyId: string,
  records: Array<{
    employeeId: string;
    date: Date;
    status: string;
    checkIn?: string;
    checkOut?: string;
    notes?: string;
  }>
) {
  const employeeIds = [...new Set(records.map((r) => r.employeeId))];
  const validEmployees = await prisma.employee.findMany({
    where: { id: { in: employeeIds }, companyId, deletedAt: null },
    select: { id: true },
  });
  const validIds = new Set(validEmployees.map((e) => e.id));
  const validRecords = records.filter((r) => validIds.has(r.employeeId));

  let succeeded = 0;
  let failed = 0;

  for (const record of validRecords) {
    try {
      const dateStr = record.date.toISOString().split("T")[0];
      await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId: record.employeeId, date: record.date } },
        create: {
          employeeId: record.employeeId,
          date: record.date,
          status: record.status as never,
          checkIn: record.checkIn ? new Date(`${dateStr}T${record.checkIn}`) : null,
          checkOut: record.checkOut ? new Date(`${dateStr}T${record.checkOut}`) : null,
          notes: record.notes ?? null,
          checkInMethod: "MANUAL",
        },
        update: {
          status: record.status as never,
          checkIn: record.checkIn ? new Date(`${dateStr}T${record.checkIn}`) : null,
          checkOut: record.checkOut ? new Date(`${dateStr}T${record.checkOut}`) : null,
          notes: record.notes ?? null,
        },
      });
      succeeded++;
    } catch {
      failed++;
    }
  }

  return { succeeded, failed, total: validRecords.length };
}
