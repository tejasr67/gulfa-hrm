import "server-only";
import { prisma } from "@/lib/prisma";
import { getDaysInMonth } from "date-fns";
import type { CalculatedPayslip, PayslipLineItemInput } from "./types";

// UAE overtime multiplier: 1.25x regular hours, 1.5x on rest/public holidays
const OT_RATE = 1.25;

function workingDaysInMonth(month: number, year: number): number {
  const days = getDaysInMonth(new Date(year, month - 1));
  let count = 0;
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 5 && dow !== 6) count++; // Fri/Sat = UAE weekend
  }
  return count;
}

export async function calculatePayslip(
  employeeId: string,
  payrollRunId: string,
  month: number,
  year: number,
): Promise<CalculatedPayslip> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // last day of month

  // 1. Active salary
  const salary = await prisma.employeeSalary.findFirst({
    where: {
      employeeId,
      isActive: true,
      effectiveFrom: { lte: endDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: startDate } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!salary) {
    throw new Error(`No active salary found for employee ${employeeId}`);
  }

  // 2. Attendance for the month
  const attendance = await prisma.attendanceRecord.findMany({
    where: {
      employeeId,
      date: { gte: startDate, lte: endDate },
    },
  });

  const totalWorkingDays = workingDaysInMonth(month, year);
  const presentDays = attendance.filter((a) =>
    ["PRESENT", "LATE", "HALF_DAY"].includes(a.status)
  ).length;
  const absentDays = attendance.filter((a) => a.status === "ABSENT").length;

  // Overtime hours from attendance records
  const overtimeHours = attendance.reduce((sum, a) => sum + (a.overtime ?? 0), 0);

  // 3. Approved leaves in this period
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    include: { leaveType: true },
  });

  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  for (const leave of leaves) {
    // Clip leave to this month
    const clampedStart = leave.startDate < startDate ? startDate : leave.startDate;
    const clampedEnd = leave.endDate > endDate ? endDate : leave.endDate;
    const days = Math.round(
      (clampedEnd.getTime() - clampedStart.getTime()) / 86_400_000 + 1
    );
    if (leave.leaveType.isPaid) {
      paidLeaveDays += days;
    } else {
      unpaidLeaveDays += days;
    }
  }

  const leaveDays = paidLeaveDays + unpaidLeaveDays;
  const paidDays = Math.min(
    totalWorkingDays,
    presentDays + paidLeaveDays
  );

  // 4. Proration factor (fraction of month actually worked/on paid leave)
  const prorateRatio = totalWorkingDays > 0 ? paidDays / totalWorkingDays : 1;

  // 5. Salary components
  const basic = salary.basicSalary * prorateRatio;
  const housing = salary.housingAllowance * prorateRatio;
  const transport = salary.transportAllowance * prorateRatio;
  const food = salary.foodAllowance * prorateRatio;
  const mobile = salary.mobileAllowance * prorateRatio;
  const other = salary.otherAllowances * prorateRatio;

  // 6. Overtime amount: (daily rate / 8 hours) * OT_RATE * overtime hours
  const dailyRate = salary.basicSalary / totalWorkingDays;
  const hourlyRate = dailyRate / 8;
  const overtimeAmount = round2(hourlyRate * OT_RATE * overtimeHours);

  // 7. Fixed monthly commission from salary record
  const commission = salary.commission ?? 0;

  // 8. Pending approved advances to deduct this month
  const advances = await prisma.salaryAdvance.findMany({
    where: {
      employeeId,
      month,
      year,
      status: "APPROVED",
    },
  });
  const advanceDeduction = advances.reduce((sum, a) => sum + a.amount, 0);

  // 9. Unpaid leave deduction
  const unpaidLeaveDeduction = round2(dailyRate * unpaidLeaveDays);

  const grossSalary = round2(basic + housing + transport + food + mobile + other + overtimeAmount + commission);
  const totalDeductions = round2(unpaidLeaveDeduction + advanceDeduction);
  const netSalary = round2(grossSalary - totalDeductions);

  // 10. Line items for audit trail
  const lineItems: PayslipLineItemInput[] = [];
  lineItems.push({ name: "Basic Salary", type: "BASIC", amount: round2(basic) });
  if (housing > 0) lineItems.push({ name: "Housing Allowance", type: "ALLOWANCE", amount: round2(housing) });
  if (transport > 0) lineItems.push({ name: "Transport Allowance", type: "ALLOWANCE", amount: round2(transport) });
  if (food > 0) lineItems.push({ name: "Food Allowance", type: "ALLOWANCE", amount: round2(food) });
  if (mobile > 0) lineItems.push({ name: "Mobile Allowance", type: "ALLOWANCE", amount: round2(mobile) });
  if (other > 0) lineItems.push({ name: "Other Allowances", type: "ALLOWANCE", amount: round2(other) });
  if (commission > 0) lineItems.push({ name: "Commission", type: "COMMISSION", amount: round2(commission) });
  if (overtimeAmount > 0) lineItems.push({ name: `Overtime (${overtimeHours.toFixed(1)}h × ${OT_RATE}x)`, type: "OVERTIME", amount: overtimeAmount });
  if (unpaidLeaveDeduction > 0) lineItems.push({ name: `Unpaid Leave (${unpaidLeaveDays}d)`, type: "DEDUCTION", amount: -unpaidLeaveDeduction });
  if (advanceDeduction > 0) lineItems.push({ name: "Salary Advance Recovery", type: "DEDUCTION", amount: -advanceDeduction });

  return {
    employeeId,
    payrollRunId,
    basicSalary: round2(basic),
    housingAllowance: round2(housing),
    transportAllowance: round2(transport),
    foodAllowance: round2(food),
    mobileAllowance: round2(mobile),
    otherAllowances: round2(other),
    overtime: overtimeAmount,
    commission: round2(commission),
    grossSalary,
    deductions: totalDeductions,
    unpaidLeaveDeduction,
    advanceDeduction,
    netSalary,
    workingDays: totalWorkingDays,
    paidDays,
    leaveDays,
    unpaidLeaveDays,
    absentDays,
    overtimeHours,
    lineItems,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
