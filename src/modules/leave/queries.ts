import "server-only";
import { prisma } from "@/lib/prisma";
import { leaveFiltersSchema } from "./schema";
import type { LeaveFilters, LeaveCalendarEntry, LeaveStats, LeaveAnalytics } from "./types";
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";

// ─── Leave Requests ───────────────────────────────────────────────────────────

export async function getLeaveRequests(companyId: string, filters: LeaveFilters = {}) {
  const { search, status, leaveTypeId, employeeId, departmentId, startDate, endDate, page = 1, limit = 20 } = filters;

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
    ...(status && { status }),
    ...(leaveTypeId && { leaveTypeId }),
    ...(startDate && { startDate: { gte: startDate } }),
    ...(endDate && { endDate: { lte: endDate } }),
  };

  const [total, requests] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
            employeeId: true,
            department: { select: { name: true } },
          },
        },
        leaveType: true,
        reliever: { select: { id: true, firstName: true, lastName: true, photo: true } },
        approvalActions: { orderBy: { createdAt: "asc" } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { data: requests, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getLeaveRequestById(id: string, companyId: string) {
  return prisma.leaveRequest.findFirst({
    where: { id, employee: { companyId } },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photo: true,
          employeeId: true,
          department: { select: { name: true } },
          manager: { select: { id: true, firstName: true, lastName: true } },
        },
      },
      leaveType: true,
      reliever: { select: { id: true, firstName: true, lastName: true, photo: true } },
      approvalActions: { orderBy: { createdAt: "asc" } },
    },
  });
}

// ─── Pending Approvals ────────────────────────────────────────────────────────

export async function getPendingApprovals(companyId: string, userId: string) {
  return prisma.leaveRequest.findMany({
    where: {
      status: { in: ["PENDING", "IN_REVIEW"] },
      employee: { companyId, deletedAt: null },
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photo: true,
          employeeId: true,
          department: { select: { name: true } },
        },
      },
      leaveType: true,
      reliever: { select: { id: true, firstName: true, lastName: true, photo: true } },
      approvalActions: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getRelieverPendingRequests(relieverEmployeeId: string) {
  return prisma.leaveRequest.findMany({
    where: {
      relieverId: relieverEmployeeId,
      relieverStatus: "PENDING",
      status: "PENDING_RELIEVER",
    },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, photo: true, employeeId: true },
      },
      leaveType: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Leave Balances ───────────────────────────────────────────────────────────

export async function getLeaveBalances(employeeId: string, year: number) {
  return prisma.leaveBalance.findMany({
    where: { employeeId, year },
    include: { leaveType: true },
    orderBy: { leaveType: { name: "asc" } },
  });
}

export async function getTeamLeaveBalances(companyId: string, year: number, departmentId?: string) {
  return prisma.leaveBalance.findMany({
    where: {
      year,
      employee: { companyId, deletedAt: null, ...(departmentId && { departmentId }) },
    },
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } },
      },
      leaveType: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ employee: { firstName: "asc" } }, { leaveType: { name: "asc" } }],
  });
}

// ─── Leave Calendar ───────────────────────────────────────────────────────────

export async function getLeaveCalendar(
  companyId: string,
  from: Date,
  to: Date,
  departmentId?: string
): Promise<LeaveCalendarEntry[]> {
  const requests = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ["APPROVED", "PENDING", "IN_REVIEW", "PENDING_RELIEVER"] },
      startDate: { lte: to },
      endDate: { gte: from },
      employee: { companyId, deletedAt: null, ...(departmentId && { departmentId }) },
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          photo: true,
          department: { select: { name: true } },
        },
      },
      leaveType: { select: { name: true, code: true } },
    },
    orderBy: { startDate: "asc" },
  });

  return requests.map((r) => ({
    id: r.id,
    employeeId: r.employee.id,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
    employeePhoto: r.employee.photo,
    department: r.employee.department?.name ?? "—",
    leaveTypeName: r.leaveType.name,
    leaveTypeCode: r.leaveType.code,
    startDate: r.startDate.toISOString().slice(0, 10),
    endDate: r.endDate.toISOString().slice(0, 10),
    totalDays: r.totalDays,
    status: r.status,
  }));
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getLeaveStats(companyId: string): Promise<LeaveStats> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [pendingApprovals, onLeaveToday, approvedThisMonth, rejectedThisMonth] =
    await Promise.all([
      prisma.leaveRequest.count({
        where: { status: { in: ["PENDING", "IN_REVIEW"] }, employee: { companyId, deletedAt: null } },
      }),
      prisma.leaveRequest.count({
        where: {
          status: "APPROVED",
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart },
          employee: { companyId, deletedAt: null },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          status: "APPROVED",
          approvedAt: { gte: monthStart, lte: monthEnd },
          employee: { companyId, deletedAt: null },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          status: "REJECTED",
          rejectedAt: { gte: monthStart, lte: monthEnd },
          employee: { companyId, deletedAt: null },
        },
      }),
    ]);

  return { pendingApprovals, onLeaveToday, approvedThisMonth, rejectedThisMonth };
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getLeaveAnalytics(
  companyId: string,
  year: number,
  departmentId?: string
): Promise<LeaveAnalytics> {
  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${year}-12-31`);

  const requests = await prisma.leaveRequest.findMany({
    where: {
      status: "APPROVED",
      startDate: { gte: yearStart, lte: yearEnd },
      employee: { companyId, deletedAt: null, ...(departmentId && { departmentId }) },
    },
    include: {
      leaveType: { select: { name: true } },
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          department: { select: { name: true } },
        },
      },
    },
  });

  // By leave type
  const ltMap = new Map<string, { name: string; days: number; requests: number }>();
  const deptMap = new Map<string, { name: string; days: number; requests: number }>();
  const monthMap = new Map<string, { month: string; days: number; requests: number }>();
  const empMap = new Map<string, { employeeName: string; employeeId: string; days: number }>();

  for (const r of requests) {
    // Leave type
    const ltKey = r.leaveType.name;
    const lt = ltMap.get(ltKey) ?? { name: ltKey, days: 0, requests: 0 };
    lt.days += r.totalDays;
    lt.requests++;
    ltMap.set(ltKey, lt);

    // Department
    const deptKey = r.employee.department?.name ?? "No Department";
    const dept = deptMap.get(deptKey) ?? { name: deptKey, days: 0, requests: 0 };
    dept.days += r.totalDays;
    dept.requests++;
    deptMap.set(deptKey, dept);

    // Month
    const monthKey = r.startDate.toISOString().slice(0, 7);
    const month = monthMap.get(monthKey) ?? { month: monthKey, days: 0, requests: 0 };
    month.days += r.totalDays;
    month.requests++;
    monthMap.set(monthKey, month);

    // Top takers
    const empKey = r.employeeId;
    const emp = empMap.get(empKey) ?? {
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
      employeeId: r.employee.employeeId,
      days: 0,
    };
    emp.days += r.totalDays;
    empMap.set(empKey, emp);
  }

  return {
    byLeaveType: Array.from(ltMap.values()).sort((a, b) => b.days - a.days),
    byDepartment: Array.from(deptMap.values()).sort((a, b) => b.days - a.days),
    byMonth: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    topTakers: Array.from(empMap.values())
      .sort((a, b) => b.days - a.days)
      .slice(0, 10),
  };
}

// ─── Leave Types ──────────────────────────────────────────────────────────────

export async function getLeaveTypes(companyId: string, activeOnly = true) {
  return prisma.leaveType.findMany({
    where: { companyId, ...(activeOnly && { isActive: true }) },
    include: { approvalConfigs: { orderBy: { step: "asc" } } },
    orderBy: { name: "asc" },
  });
}

// ─── Encashment ───────────────────────────────────────────────────────────────

export async function getEncashmentRequests(companyId: string, status?: string) {
  return prisma.leaveEncashmentRequest.findMany({
    where: {
      employee: { companyId, deletedAt: null },
      ...(status && { status: status as never }),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
      leaveType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Carry Forward Log ────────────────────────────────────────────────────────

export async function getCarryForwardLog(companyId: string, fromYear: number) {
  return prisma.leaveCarryForwardLog.findMany({
    where: { companyId, fromYear },
    include: { leaveType: { select: { id: true, name: true } } },
    orderBy: [{ leaveType: { name: "asc" } }],
  });
}

export async function getCarryForwardSummary(companyId: string, fromYear: number) {
  const logs = await getCarryForwardLog(companyId, fromYear);
  const totalEmployees = new Set(logs.map((l) => l.employeeId)).size;
  const totalDaysCarried = logs.reduce((s, l) => s + l.daysCarried, 0);
  const totalDaysExpired = logs.reduce((s, l) => s + l.daysExpired, 0);
  return { logs, totalEmployees, totalDaysCarried, totalDaysExpired };
}
