"use server";

import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { writeAuditLog } from "@/lib/utils/audit";
import { calculateWorkingDays } from "@/lib/leave/working-days";
import { checkLeaveEligibility } from "@/lib/leave/eligibility";
import { checkRelieverAvailability } from "@/lib/leave/overlap";
import {
  resolveApproversForStep,
  getMaxApprovalSteps,
  resolveStatusAfterApproval,
  isAuthorizedApprover,
} from "@/lib/leave/approval-engine";
import { createLeaveRequestSchema, approveLeaveSchema } from "./schema";
import type { Prisma as PrismaTypes } from "@prisma/client";
import { z } from "zod";

// ─── Apply for Leave ──────────────────────────────────────────────────────────

const applyLeaveInputSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.coerce.date({ error: "Start date is required" }),
  endDate: z.coerce.date({ error: "End date is required" }),
  reason: z.string().optional(),
  isHalfDay: z.boolean().optional().default(false),
  halfDayPeriod: z.enum(["MORNING", "AFTERNOON"]).optional(),
  relieverId: z.string().optional(),
  attachments: z.array(z.string()).optional().default([]),
});

export async function applyForLeave(
  raw: z.infer<typeof applyLeaveInputSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const session = await requireSession();
  await requirePermission(session, "LEAVE:CREATE");

  const parsed = applyLeaveInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const input = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
      // Get employee and company context
      const employee = await tx.employee.findUnique({
        where: { id: input.employeeId },
        select: { companyId: true },
      });
      if (!employee) throw new Error("Employee not found");

      const totalDays = await calculateWorkingDays(
        employee.companyId,
        input.startDate,
        input.endDate,
        input.isHalfDay
      );

      if (totalDays <= 0) {
        throw new Error("Selected dates contain no working days.");
      }

      // Full eligibility check (balance, probation, overlap, etc.)
      const eligibility = await checkLeaveEligibility(
        input.employeeId,
        input.leaveTypeId,
        input.startDate,
        input.endDate,
        totalDays,
        input.isHalfDay,
        tx
      );
      if (!eligibility.eligible) throw new Error(eligibility.reason!);

      // Reliever availability check
      if (input.relieverId) {
        const relieverCheck = await checkRelieverAvailability(
          input.relieverId,
          input.startDate,
          input.endDate,
          tx
        );
        if (!relieverCheck.available) {
          throw new Error("The selected reliever already has leave during this period.");
        }
      }

      const leaveType = await tx.leaveType.findUnique({ where: { id: input.leaveTypeId } });
      const relieverStatus = leaveType?.requiresReliever && input.relieverId
        ? "PENDING"
        : "NOT_REQUIRED";

      const request = await tx.leaveRequest.create({
        data: {
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          startDate: input.startDate,
          endDate: input.endDate,
          totalDays,
          isHalfDay: input.isHalfDay,
          halfDayPeriod: input.halfDayPeriod,
          reason: input.reason,
          relieverId: input.relieverId,
          relieverStatus,
          attachments: input.attachments,
          status: "PENDING",
          currentApprovalStep: 1,
        },
      });

      // Hold the balance as pending
      await tx.leaveBalance.updateMany({
        where: {
          employeeId: input.employeeId,
          leaveTypeId: input.leaveTypeId,
          year: input.startDate.getFullYear(),
        },
        data: { pending: { increment: totalDays } },
      });

      return request;
    });

    writeAuditLog({
      userId: session.userId,
      action: "CREATE",
      module: "LEAVE",
      entityId: result.id,
      entityType: "LeaveRequest",
      employeeId: input.employeeId,
      newValues: { leaveTypeId: input.leaveTypeId, startDate: input.startDate, endDate: input.endDate, totalDays: result.totalDays },
    }).catch(() => {});

    return { success: true, id: result.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to submit leave request" };
  }
}

// ─── Process Approval Step ────────────────────────────────────────────────────

const processApprovalSchema = z.object({
  leaveRequestId: z.string().min(1),
  action: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().optional(),
});

export async function processLeaveApproval(
  raw: z.infer<typeof processApprovalSchema>
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  await requirePermission(session, "LEAVE:APPROVE");

  const parsed = processApprovalSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { leaveRequestId, action, note } = parsed.data;

  try {
    await prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
      const request = await tx.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        include: { employee: { select: { companyId: true, firstName: true, lastName: true } }, leaveType: true },
      });
      if (!request) throw new Error("Leave request not found");
      if (!["PENDING", "IN_REVIEW"].includes(request.status)) {
        throw new Error(`Cannot act on a request in ${request.status} status`);
      }

      // Authorization: must be the configured approver for this step
      const authorized = await isAuthorizedApprover(leaveRequestId, session.userId, tx);
      if (!authorized) throw new Error("You are not authorized to approve this request at this step");

      const maxSteps = await getMaxApprovalSteps(
        request.employee.companyId,
        request.leaveTypeId,
        tx
      );

      // Log this approval action
      await tx.leaveApprovalAction.create({
        data: {
          leaveRequestId,
          step: request.currentApprovalStep,
          approverId: session.userId,
          approverName: session.userId,
          action,
          note,
        },
      });

      if (action === "REJECTED") {
        // Release the balance hold
        await tx.leaveBalance.updateMany({
          where: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: new Date(request.startDate).getFullYear(),
          },
          data: { pending: { decrement: request.totalDays } },
        });

        await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: "REJECTED",
            rejectedBy: session.userId,
            rejectedAt: new Date(),
            rejectReason: note,
          },
        });
        return;
      }

      // APPROVED — advance step or finalize
      const nextStatus = resolveStatusAfterApproval(
        request.currentApprovalStep,
        maxSteps,
        request.leaveType.requiresReliever,
        request.relieverStatus
      );

      if (nextStatus === "APPROVED") {
        await tx.leaveBalance.updateMany({
          where: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: new Date(request.startDate).getFullYear(),
          },
          data: {
            pending: { decrement: request.totalDays },
            used: { increment: request.totalDays },
            remaining: { decrement: request.totalDays },
          },
        });

        await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: "APPROVED",
            approvedBy: session.userId,
            approvedAt: new Date(),
          },
        });
      } else {
        await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            status: nextStatus,
            currentApprovalStep: request.currentApprovalStep + 1,
          },
        });
      }
    });

    writeAuditLog({
      userId: session.userId,
      action: action === "APPROVED" ? "APPROVE" : "REJECT",
      module: "LEAVE",
      entityId: leaveRequestId,
      entityType: "LeaveRequest",
    }).catch(() => {});

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to process approval" };
  }
}

// ─── Reliever Response ────────────────────────────────────────────────────────

export async function respondToRelieverRequest(
  leaveRequestId: string,
  accepted: boolean,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();

  try {
    await prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
      const request = await tx.leaveRequest.findUnique({
        where: { id: leaveRequestId },
        include: { reliever: { select: { userId: true } } },
      });
      if (!request) throw new Error("Leave request not found");
      if (request.reliever?.userId !== session.userId) {
        throw new Error("You are not the designated reliever for this request");
      }
      if (request.status !== "PENDING_RELIEVER") {
        throw new Error("This request is not awaiting reliever confirmation");
      }

      if (accepted) {
        await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            relieverStatus: "ACCEPTED",
            relieverNote: note,
            relieverApprovedAt: new Date(),
            // Reliever accepted — proceed to final APPROVED
            status: "APPROVED",
            approvedAt: new Date(),
          },
        });

        // Finalize balance
        await tx.leaveBalance.updateMany({
          where: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: new Date(request.startDate).getFullYear(),
          },
          data: {
            pending: { decrement: request.totalDays },
            used: { increment: request.totalDays },
            remaining: { decrement: request.totalDays },
          },
        });
      } else {
        // Reliever declined → back to IN_REVIEW so HR can re-assign
        await tx.leaveRequest.update({
          where: { id: leaveRequestId },
          data: {
            relieverStatus: "DECLINED",
            relieverNote: note,
            status: "IN_REVIEW",
          },
        });
      }
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to respond" };
  }
}

// ─── Cancel / Withdraw ────────────────────────────────────────────────────────

export async function cancelLeaveRequest(
  leaveRequestId: string,
  employeeId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();

  try {
    await prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
      const request = await tx.leaveRequest.findUnique({ where: { id: leaveRequestId } });
      if (!request) throw new Error("Leave request not found");
      if (request.employeeId !== employeeId) throw new Error("Not authorized");
      if (!["PENDING", "IN_REVIEW", "PENDING_RELIEVER"].includes(request.status)) {
        throw new Error("Only pending requests can be cancelled");
      }

      await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
      });

      // Release pending balance
      await tx.leaveBalance.updateMany({
        where: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year: new Date(request.startDate).getFullYear(),
        },
        data: { pending: { decrement: request.totalDays } },
      });
    });

    writeAuditLog({
      userId: session.userId,
      action: "CANCEL",
      module: "LEAVE",
      entityId: leaveRequestId,
      entityType: "LeaveRequest",
      employeeId,
    }).catch(() => {});

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to cancel" };
  }
}

export async function withdrawLeaveRequest(
  leaveRequestId: string,
  employeeId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();

  try {
    await prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
      const request = await tx.leaveRequest.findUnique({ where: { id: leaveRequestId } });
      if (!request) throw new Error("Leave request not found");
      if (request.employeeId !== employeeId) throw new Error("Not authorized");
      if (request.status !== "APPROVED") throw new Error("Only approved requests can be withdrawn");

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const start = new Date(request.startDate);
      if (start <= today) throw new Error("Cannot withdraw a leave that has already started");

      await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { status: "WITHDRAWN", withdrawnAt: new Date(), cancelReason: reason },
      });

      // Restore the used/remaining balance
      await tx.leaveBalance.updateMany({
        where: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year: new Date(request.startDate).getFullYear(),
        },
        data: {
          used: { decrement: request.totalDays },
          remaining: { increment: request.totalDays },
        },
      });
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to withdraw" };
  }
}

// ─── Year-End Carry-Forward ───────────────────────────────────────────────────

export async function processYearEndCarryForward(
  fromYear: number
): Promise<{ success: boolean; processed?: number; error?: string }> {
  const session = await requireSession();
  await requirePermission(session, "LEAVE:MANAGE");

  const companyId = session.companyId;
  const toYear = fromYear + 1;

  try {
    const leaveTypes = await prisma.leaveType.findMany({
      where: { companyId, carryForward: true, isActive: true },
    });

    let processed = 0;

    for (const lt of leaveTypes) {
      const balances = await prisma.leaveBalance.findMany({
        where: { leaveType: { companyId }, leaveTypeId: lt.id, year: fromYear },
      });

      for (const balance of balances) {
        // Already processed?
        const existing = await prisma.leaveCarryForwardLog.findFirst({
          where: { employeeId: balance.employeeId, leaveTypeId: lt.id, fromYear },
        });
        if (existing) continue;

        const rawCarry = balance.remaining;
        const maxCarry = lt.maxCarryForward ?? Infinity;
        const daysCarried = Math.min(rawCarry, maxCarry);
        const daysExpired = rawCarry - daysCarried;

        await prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
          // Update from-year balance (zero remaining)
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: { remaining: 0 },
          });

          // Add carried days to next year's balance (create if missing)
          const nextBalance = await tx.leaveBalance.findFirst({
            where: { employeeId: balance.employeeId, leaveTypeId: lt.id, year: toYear },
          });

          if (nextBalance) {
            await tx.leaveBalance.update({
              where: { id: nextBalance.id },
              data: {
                carried: { increment: daysCarried },
                allocated: { increment: daysCarried },
                remaining: { increment: daysCarried },
              },
            });
          } else {
            await tx.leaveBalance.create({
              data: {
                employeeId: balance.employeeId,
                leaveTypeId: lt.id,
                year: toYear,
                allocated: daysCarried,
                carried: daysCarried,
                remaining: daysCarried,
              },
            });
          }

          await tx.leaveCarryForwardLog.create({
            data: {
              companyId,
              employeeId: balance.employeeId,
              leaveTypeId: lt.id,
              fromYear,
              toYear,
              daysCarried,
              daysExpired,
              processedBy: session.userId,
            },
          });
        });

        processed++;
      }
    }

    writeAuditLog({
      userId: session.userId,
      action: "CARRY_FORWARD",
      module: "LEAVE",
      entityId: companyId,
      entityType: "Company",
      newValues: { fromYear, toYear, processed },
    }).catch(() => {});

    return { success: true, processed };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Carry-forward failed" };
  }
}

// ─── Leave Encashment ─────────────────────────────────────────────────────────

const encashmentInputSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  year: z.number().int(),
  days: z.number().positive(),
});

export async function requestLeaveEncashment(
  raw: z.infer<typeof encashmentInputSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const session = await requireSession();

  const parsed = encashmentInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { employeeId, leaveTypeId, year, days } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
      const [leaveType, balance, salary] = await Promise.all([
        tx.leaveType.findUnique({ where: { id: leaveTypeId } }),
        tx.leaveBalance.findFirst({ where: { employeeId, leaveTypeId, year } }),
        tx.employeeSalary.findFirst({
          where: { employeeId, isActive: true },
          orderBy: { effectiveFrom: "desc" },
        }),
      ]);

      if (!leaveType) throw new Error("Leave type not found");
      if (!leaveType.encashable) throw new Error("This leave type does not support encashment");
      if (!balance) throw new Error("No leave balance found");

      const maxDays = leaveType.maxEncashDays ?? Infinity;
      if (days > maxDays) throw new Error(`Maximum encashable days for this leave type is ${maxDays}`);
      if (days > balance.remaining) throw new Error(`Only ${balance.remaining} days available for encashment`);

      // Calculate amount: (monthly basic / working days per month) * days
      let amount: number | undefined;
      if (salary) {
        const dailyRate = Number(salary.basicSalary) / 26; // 26 working days in UAE month
        amount = Math.round(dailyRate * days * 100) / 100;
      }

      const req = await tx.leaveEncashmentRequest.create({
        data: { employeeId, leaveTypeId, year, days, amount },
      });

      // Earmark the days (reduce remaining, don't touch "used" until processed)
      await tx.leaveBalance.updateMany({
        where: { employeeId, leaveTypeId, year },
        data: { remaining: { decrement: days } },
      });

      return req;
    });

    return { success: true, id: result.id };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Encashment request failed" };
  }
}

export async function processEncashment(
  encashmentId: string,
  action: "APPROVED" | "REJECTED",
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  await requirePermission(session, "LEAVE:MANAGE");

  try {
    await prisma.$transaction(async (tx: PrismaTypes.TransactionClient) => {
      const req = await tx.leaveEncashmentRequest.findUnique({ where: { id: encashmentId } });
      if (!req) throw new Error("Encashment request not found");
      if (req.status !== "PENDING") throw new Error("Request is not pending");

      if (action === "APPROVED") {
        await tx.leaveEncashmentRequest.update({
          where: { id: encashmentId },
          data: { status: "APPROVED", approvedBy: session.userId, approvedAt: new Date(), notes },
        });
        await tx.leaveBalance.updateMany({
          where: { employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year: req.year },
          data: { encashed: { increment: req.days }, used: { increment: req.days } },
        });
      } else {
        // Rejected — restore the earmarked days
        await tx.leaveEncashmentRequest.update({
          where: { id: encashmentId },
          data: { status: "REJECTED", notes },
        });
        await tx.leaveBalance.updateMany({
          where: { employeeId: req.employeeId, leaveTypeId: req.leaveTypeId, year: req.year },
          data: { remaining: { increment: req.days } },
        });
      }
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to process encashment" };
  }
}
