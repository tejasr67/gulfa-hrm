import { prisma } from "@/lib/prisma";
import type { Prisma as PrismaTypes } from "@prisma/client";
import type { LeaveFilters, CreateLeaveRequestInput, ApproveLeaveInput } from "./types";
import { PAGINATION_DEFAULTS } from "@/lib/utils/constants";

export async function getLeaveRequests(
  companyId: string,
  filters: LeaveFilters = {}
) {
  const {
    search,
    status,
    leaveTypeId,
    employeeId,
    page = PAGINATION_DEFAULTS.page,
    limit = PAGINATION_DEFAULTS.limit,
  } = filters;

  const where = {
    employee: {
      companyId,
      deletedAt: null,
      ...(employeeId && { id: employeeId }),
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
  };

  const [total, requests] = await prisma.$transaction([
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
          },
        },
        leaveType: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    data: requests,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getLeaveBalances(employeeId: string, year: number) {
  return prisma.leaveBalance.findMany({
    where: { employeeId, year },
    include: { leaveType: true },
    orderBy: { leaveType: { name: "asc" } },
  });
}

/**
 * Creates a leave request inside a transaction.
 *
 * Balance enforcement: we check (remaining - pending) BEFORE creating the request,
 * not just remaining. This prevents two concurrent PENDING requests from both
 * being approved when only one can fit (double-booking).
 *
 * NOTE: totalDays must be calculated outside this function using a UAE-aware
 * working-days calculator that accounts for company weekend config and public holidays.
 */
export async function createLeaveRequest(
  employeeId: string,
  input: CreateLeaveRequestInput
) {
  return prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
    const year = new Date(input.startDate).getFullYear();

    const balance = await tx.leaveBalance.findFirst({
      where: { employeeId, leaveTypeId: input.leaveTypeId, year },
    });

    if (!balance) {
      throw new Error(
        "No leave balance found for this leave type and year. Contact HR."
      );
    }

    // The actual available days is remaining minus what's already pending approval.
    // Without this check, two 15-day requests against a 20-day balance would both
    // enter PENDING, and the second approval would make remaining go negative.
    const availableDays = balance.remaining - balance.pending;
    if (input.totalDays > availableDays) {
      throw new Error(
        `Insufficient leave balance. Available: ${availableDays} days, Requested: ${input.totalDays} days.`
      );
    }

    const request = await tx.leaveRequest.create({
      data: {
        employeeId,
        leaveTypeId: input.leaveTypeId,
        startDate: input.startDate,
        endDate: input.endDate,
        totalDays: input.totalDays,
        reason: input.reason,
        status: "PENDING",
      },
    });

    await tx.leaveBalance.update({
      where: { id: balance.id },
      data: { pending: { increment: input.totalDays } },
    });

    return request;
  });
}

export async function approveLeaveRequest(
  id: string,
  companyId: string,
  input: ApproveLeaveInput,
  userId: string
) {
  return prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
    const request = await tx.leaveRequest.findFirst({
      where: { id, employee: { companyId } },
    });
    if (!request) throw new Error("Leave request not found");
    if (request.status !== "PENDING") throw new Error("Request is no longer pending");

    const updated = await tx.leaveRequest.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.status === "APPROVED"
          ? { approvedBy: userId, approvedAt: new Date() }
          : { rejectedBy: userId, rejectedAt: new Date(), rejectReason: input.rejectReason }),
      },
    });

    const year = new Date(request.startDate).getFullYear();

    if (input.status === "APPROVED") {
      await tx.leaveBalance.updateMany({
        where: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
        data: {
          pending: { decrement: request.totalDays },
          used: { increment: request.totalDays },
          remaining: { decrement: request.totalDays },
        },
      });
    } else {
      // On rejection, release the pending hold so those days are available again
      await tx.leaveBalance.updateMany({
        where: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
        },
        data: { pending: { decrement: request.totalDays } },
      });
    }

    return updated;
  });
}
