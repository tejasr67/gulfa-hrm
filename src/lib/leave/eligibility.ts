import "server-only";
import { prisma } from "@/lib/prisma";
import { checkOverlappingLeave } from "./overlap";
import type { Prisma as PrismaTypes } from "@prisma/client";

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  availableDays?: number;
}

/**
 * Full eligibility check before a leave request is created. Validates:
 * 1. Leave type is active and gender-appropriate
 * 2. Minimum service months met
 * 3. Probation restrictions
 * 4. Minimum notice period
 * 5. Max consecutive days
 * 6. No overlapping active requests
 * 7. Sufficient balance (remaining - pending)
 *
 * Call this inside the same transaction as createLeaveRequest to prevent
 * TOCTOU race conditions.
 */
export async function checkLeaveEligibility(
  employeeId: string,
  leaveTypeId: string,
  startDate: Date,
  endDate: Date,
  totalDays: number,
  isHalfDay: boolean,
  tx?: PrismaTypes.TransactionClient
): Promise<EligibilityResult> {
  const db = tx ?? prisma;

  const [employee, leaveType, balance] = await Promise.all([
    db.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        gender: true,
        joiningDate: true,
        confirmationDate: true,
        status: true,
      },
    }),
    db.leaveType.findUnique({ where: { id: leaveTypeId } }),
    db.leaveBalance.findFirst({
      where: {
        employeeId,
        leaveTypeId,
        year: startDate.getFullYear(),
      },
    }),
  ]);

  if (!employee) return { eligible: false, reason: "Employee not found." };
  if (!leaveType) return { eligible: false, reason: "Leave type not found." };
  if (!leaveType.isActive) return { eligible: false, reason: "This leave type is no longer active." };

  // Gender restriction
  if (leaveType.genderRestriction !== "ALL") {
    if (employee.gender !== leaveType.genderRestriction) {
      return { eligible: false, reason: `This leave type is only available for ${leaveType.genderRestriction.toLowerCase()} employees.` };
    }
  }

  // Minimum service months
  if (leaveType.minServiceMonths > 0) {
    const monthsOfService = monthsDiff(employee.joiningDate, startDate);
    if (monthsOfService < leaveType.minServiceMonths) {
      return {
        eligible: false,
        reason: `You need at least ${leaveType.minServiceMonths} months of service to apply for this leave. You have ${monthsOfService} months.`,
      };
    }
  }

  // Probation restriction
  const isOnProbation = !employee.confirmationDate || employee.confirmationDate > startDate;
  if (isOnProbation) {
    if (!leaveType.allowedDuringProbation) {
      return { eligible: false, reason: "This leave type is not available during probation period." };
    }
    if (leaveType.probationDaysLimit !== null && leaveType.probationDaysLimit !== undefined) {
      if (totalDays > leaveType.probationDaysLimit) {
        return {
          eligible: false,
          reason: `During probation, a maximum of ${leaveType.probationDaysLimit} days is allowed for this leave type.`,
        };
      }
    }
  }

  // Minimum notice period (days from today to startDate)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysNotice = Math.floor((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (daysNotice < leaveType.minDaysNotice) {
    return {
      eligible: false,
      reason: `This leave type requires at least ${leaveType.minDaysNotice} day(s) notice. Your request starts in ${daysNotice} day(s).`,
    };
  }

  // Max consecutive days
  if (!isHalfDay && leaveType.maxConsecutiveDays !== null && leaveType.maxConsecutiveDays !== undefined) {
    if (totalDays > leaveType.maxConsecutiveDays) {
      return {
        eligible: false,
        reason: `This leave type allows a maximum of ${leaveType.maxConsecutiveDays} consecutive days per request.`,
      };
    }
  }

  // Overlapping leave check
  const overlaps = await checkOverlappingLeave(employeeId, startDate, endDate, undefined, db);
  if (overlaps.length > 0) {
    const o = overlaps[0];
    return {
      eligible: false,
      reason: `You already have an active ${o.leaveTypeName} leave request from ${fmtDate(o.startDate)} to ${fmtDate(o.endDate)} that overlaps with this request.`,
    };
  }

  // Balance check
  if (!balance) {
    return { eligible: false, reason: "No leave balance allocated for this leave type in the current year. Please contact HR." };
  }
  const availableDays = balance.remaining - balance.pending;
  if (totalDays > availableDays) {
    return {
      eligible: false,
      reason: `Insufficient balance. Available: ${availableDays} day(s), requested: ${totalDays} day(s).`,
      availableDays,
    };
  }

  return { eligible: true, availableDays };
}

function monthsDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" });
}
