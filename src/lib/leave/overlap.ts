import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma as PrismaTypes } from "@prisma/client";

/**
 * Checks if an employee has any active (PENDING, IN_REVIEW, or APPROVED) leave
 * that overlaps with the proposed date range.
 *
 * Overlap condition: existing.startDate <= endDate AND existing.endDate >= startDate
 *
 * Call this inside a transaction before creating or updating a leave request to
 * prevent double-booking. Race condition safety: the surrounding $transaction
 * with SERIALIZABLE isolation (or advisory lock) ensures two concurrent requests
 * don't both pass this check simultaneously.
 */
export async function checkOverlappingLeave(
  employeeId: string,
  startDate: Date,
  endDate: Date,
  excludeId?: string,
  tx?: PrismaTypes.TransactionClient
): Promise<Array<{ id: string; startDate: Date; endDate: Date; status: string; leaveTypeName: string }>> {
  const db = tx ?? prisma;

  const overlapping = await db.leaveRequest.findMany({
    where: {
      employeeId,
      status: { in: ["PENDING", "PENDING_RELIEVER", "IN_REVIEW", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      status: true,
      leaveType: { select: { name: true } },
    },
  });

  return overlapping.map((r) => ({
    id: r.id,
    startDate: r.startDate,
    endDate: r.endDate,
    status: r.status,
    leaveTypeName: r.leaveType.name,
  }));
}

/**
 * Checks if a reliever already has approved/pending leave during the proposed period.
 * Returns true if the reliever is available (no conflicts).
 */
export async function checkRelieverAvailability(
  relieverId: string,
  startDate: Date,
  endDate: Date,
  tx?: PrismaTypes.TransactionClient
): Promise<{ available: boolean; conflictingLeave?: { startDate: Date; endDate: Date } }> {
  const db = tx ?? prisma;

  const conflict = await db.leaveRequest.findFirst({
    where: {
      employeeId: relieverId,
      status: { in: ["PENDING", "PENDING_RELIEVER", "IN_REVIEW", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { startDate: true, endDate: true },
  });

  if (conflict) return { available: false, conflictingLeave: conflict };
  return { available: true };
}
