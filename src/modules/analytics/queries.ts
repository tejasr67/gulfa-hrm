import "server-only";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, subMonths, format, differenceInMonths } from "date-fns";

// ── HR Analytics ──────────────────────────────────────────────────────────────

export type HeadcountPoint = { month: string; total: number; hires: number; terminations: number };
export type DeptBreakdown = { name: string; count: number };
export type NationalityBreakdown = { nationality: string; count: number };
export type EmploymentTypeBreakdown = { type: string; count: number };

export type HRAnalytics = {
  headcountTrend: HeadcountPoint[];
  byDepartment: DeptBreakdown[];
  byNationality: NationalityBreakdown[];
  byEmploymentType: EmploymentTypeBreakdown[];
  totalActive: number;
  avgTenureMonths: number;
  turnoverRate: number; // % over last 12 months
};

export async function getHRAnalytics(companyId: string, year: number): Promise<HRAnalytics> {
  const now = new Date();

  // Build 12-month window: Jan of year → min(Dec, today)
  const windowStart = new Date(year, 0, 1);
  const windowEnd = year === now.getFullYear() ? now : new Date(year, 11, 31);

  // Fetch all employees ever in this company (including terminated, not hard-deleted)
  const employees = await prisma.employee.findMany({
    where: { companyId, deletedAt: null },
    select: {
      id: true,
      joiningDate: true,
      terminationDate: true,
      nationality: true,
      employmentType: true,
      departmentId: true,
      status: true,
      department: { select: { name: true } },
    },
  });

  // Headcount trend — for each month compute active employees at end of month
  const months: HeadcountPoint[] = [];
  let m = new Date(windowStart);
  while (m <= windowEnd) {
    const monthEnd = endOfMonth(m);
    const effectiveEnd = monthEnd > now ? now : monthEnd;
    const monthLabel = format(m, "MMM yyyy");

    const hires = employees.filter(
      (e) => e.joiningDate >= startOfMonth(m) && e.joiningDate <= effectiveEnd
    ).length;

    const terminations = employees.filter(
      (e) =>
        e.terminationDate &&
        e.terminationDate >= startOfMonth(m) &&
        e.terminationDate <= effectiveEnd
    ).length;

    const total = employees.filter(
      (e) =>
        e.joiningDate <= effectiveEnd &&
        (e.terminationDate === null || e.terminationDate > effectiveEnd)
    ).length;

    months.push({ month: monthLabel, total, hires, terminations });
    m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  }

  // Department breakdown (current active)
  const deptMap = new Map<string, number>();
  for (const e of employees) {
    if (e.status === "ACTIVE") {
      const name = e.department?.name ?? "Unassigned";
      deptMap.set(name, (deptMap.get(name) ?? 0) + 1);
    }
  }
  const byDepartment = [...deptMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // Nationality breakdown (top 10 active)
  const natMap = new Map<string, number>();
  for (const e of employees) {
    if (e.status === "ACTIVE") {
      const nat = e.nationality ?? "Unknown";
      natMap.set(nat, (natMap.get(nat) ?? 0) + 1);
    }
  }
  const byNationality = [...natMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([nationality, count]) => ({ nationality, count }));

  // Employment type breakdown (current active)
  const typeMap = new Map<string, number>();
  for (const e of employees) {
    if (e.status === "ACTIVE") {
      typeMap.set(e.employmentType, (typeMap.get(e.employmentType) ?? 0) + 1);
    }
  }
  const byEmploymentType = [...typeMap.entries()]
    .map(([type, count]) => ({ type, count }));

  // Active count
  const totalActive = employees.filter((e) => e.status === "ACTIVE").length;

  // Average tenure (active employees)
  const active = employees.filter((e) => e.status === "ACTIVE");
  const avgTenureMonths =
    active.length === 0
      ? 0
      : Math.round(
          active.reduce((sum, e) => sum + differenceInMonths(now, e.joiningDate), 0) /
            active.length
        );

  // Turnover rate — terminations in last 12 months / avg headcount
  const twelveMonthsAgo = subMonths(now, 12);
  const terminatedLast12 = employees.filter(
    (e) => e.terminationDate && e.terminationDate >= twelveMonthsAgo
  ).length;
  const turnoverRate =
    totalActive > 0 ? Math.round((terminatedLast12 / totalActive) * 100) : 0;

  return {
    headcountTrend: months,
    byDepartment,
    byNationality,
    byEmploymentType,
    totalActive,
    avgTenureMonths,
    turnoverRate,
  };
}

// ── Payroll Analytics ─────────────────────────────────────────────────────────

export type PayrollMonthPoint = { month: string; totalCost: number; employeeCount: number };
export type PayrollDeptBreakdown = { name: string; totalCost: number };

export type PayrollAnalytics = {
  byMonth: PayrollMonthPoint[];
  byDepartment: PayrollDeptBreakdown[];
  ytdTotal: number;
  ytdCount: number;
  avgSalary: number;
  highestDept: string;
};

export async function getPayrollAnalytics(companyId: string, year: number): Promise<PayrollAnalytics> {
  const runs = await prisma.payrollRun.findMany({
    where: { companyId, year },
    include: {
      payslips: {
        select: {
          netSalary: true,
          employee: {
            select: {
              department: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { month: "asc" },
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const byMonth: PayrollMonthPoint[] = runs.map((r) => ({
    month: monthNames[r.month - 1],
    totalCost: Number(r.totalAmount ?? 0),
    employeeCount: r.payslips.length,
  }));

  // Department breakdown from all payslips in the year
  const deptMap = new Map<string, number>();
  for (const run of runs) {
    for (const slip of run.payslips) {
      const dept = slip.employee.department?.name ?? "Unassigned";
      deptMap.set(dept, (deptMap.get(dept) ?? 0) + Number(slip.netSalary ?? 0));
    }
  }
  const byDepartment = [...deptMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, totalCost]) => ({ name, totalCost }));

  const ytdTotal = byMonth.reduce((s, m) => s + m.totalCost, 0);
  const allPayslipCount = runs.reduce((s, r) => s + r.payslips.length, 0);
  const avgSalary = allPayslipCount > 0 ? Math.round(ytdTotal / allPayslipCount) : 0;
  const highestDept = byDepartment[0]?.name ?? "—";

  return {
    byMonth,
    byDepartment,
    ytdTotal,
    ytdCount: allPayslipCount,
    avgSalary,
    highestDept,
  };
}

// ── Attendance Analytics ──────────────────────────────────────────────────────

export type AttendanceDayPoint = { date: string; present: number; absent: number; late: number; onLeave: number };
export type AttendanceDeptPoint = { name: string; rate: number; present: number; expected: number };
export type AttendanceMonthPoint = { month: string; rate: number; avgWorkHours: number };

export type AttendanceAnalytics = {
  daily: AttendanceDayPoint[];
  byDepartment: AttendanceDeptPoint[];
  monthly: AttendanceMonthPoint[];
  avgRate: number;
  totalLate: number;
  totalAbsent: number;
};

export async function getAttendanceAnalytics(
  companyId: string,
  year: number,
  month?: number
): Promise<AttendanceAnalytics> {
  const now = new Date();

  // For daily view: last 30 days of the selected month, or last 30 days if current
  const periodEnd = month
    ? endOfMonth(new Date(year, month - 1, 1))
    : now;
  const periodStart = month
    ? startOfMonth(new Date(year, month - 1, 1))
    : new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const effectiveEnd = periodEnd > now ? now : periodEnd;

  // Single query for the full year — daily/dept views filter in memory from this
  const yearEnd = year === now.getFullYear() ? now : new Date(year, 11, 31);
  const allRecords = await prisma.attendanceRecord.findMany({
    where: {
      employee: { companyId, deletedAt: null },
      date: { gte: new Date(year, 0, 1), lte: yearEnd },
    },
    select: {
      date: true,
      status: true,
      workHours: true,
      employee: {
        select: { departmentId: true, department: { select: { name: true } } },
      },
    },
  });

  // Restrict to the selected period for daily/dept views
  const records = allRecords.filter(
    (r) => r.date >= periodStart && r.date <= effectiveEnd
  );

  // Daily breakdown
  const dayMap = new Map<string, { present: number; absent: number; late: number; onLeave: number }>();
  for (const r of records) {
    const key = format(r.date, "dd MMM");
    const entry = dayMap.get(key) ?? { present: 0, absent: 0, late: 0, onLeave: 0 };
    if (r.status === "PRESENT") entry.present++;
    else if (r.status === "ABSENT") entry.absent++;
    else if (r.status === "LATE") { entry.present++; entry.late++; }
    else if (r.status === "ON_LEAVE") entry.onLeave++;
    dayMap.set(key, entry);
  }
  const daily: AttendanceDayPoint[] = [...dayMap.entries()].map(([date, v]) => ({ date, ...v }));

  // Department breakdown
  const deptPresent = new Map<string, number>();
  const deptExpected = new Map<string, number>();
  for (const r of records) {
    const dept = r.employee.department?.name ?? "Unassigned";
    deptExpected.set(dept, (deptExpected.get(dept) ?? 0) + 1);
    if (r.status === "PRESENT" || r.status === "LATE") {
      deptPresent.set(dept, (deptPresent.get(dept) ?? 0) + 1);
    }
  }
  const byDepartment: AttendanceDeptPoint[] = [...deptExpected.entries()].map(([name, expected]) => {
    const present = deptPresent.get(name) ?? 0;
    return { name, rate: expected > 0 ? Math.round((present / expected) * 100) : 0, present, expected };
  }).sort((a, b) => b.rate - a.rate);

  // Monthly trend — use the already-fetched full-year data
  const monthMap = new Map<number, { present: number; total: number; hours: number }>();
  for (const r of allRecords) {
    const mo = r.date.getMonth();
    const entry = monthMap.get(mo) ?? { present: 0, total: 0, hours: 0 };
    entry.total++;
    if (r.status === "PRESENT" || r.status === "LATE") {
      entry.present++;
      entry.hours += Number(r.workHours ?? 0);
    }
    monthMap.set(mo, entry);
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthly: AttendanceMonthPoint[] = monthNames.map((name, i) => {
    const d = monthMap.get(i) ?? { present: 0, total: 0, hours: 0 };
    return {
      month: name,
      rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
      avgWorkHours: d.present > 0 ? Math.round((d.hours / d.present) * 10) / 10 : 0,
    };
  });

  const periodRecords = records; // alias for clarity
  const allPresent = periodRecords.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
  const avgRate = periodRecords.length > 0 ? Math.round((allPresent / periodRecords.length) * 100) : 0;
  const totalLate = periodRecords.filter((r) => r.status === "LATE").length;
  const totalAbsent = periodRecords.filter((r) => r.status === "ABSENT").length;

  return { daily, byDepartment, monthly, avgRate, totalLate, totalAbsent };
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = String(r[h] ?? "");
        return v.includes(",") ? `"${v}"` : v;
      }).join(",")
    ),
  ];
  return lines.join("\n");
}
