import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma as PrismaTypes, LeaveStatus, ApproverType } from "@prisma/client";

export interface ResolvedApprover {
  userId: string;
  name: string;
  step: number;
  approverType: ApproverType;
}

/**
 * Resolves who must approve at a given step for this leave request.
 * Looks up LeaveApprovalConfig for the specific leave type, falling back
 * to the company-wide config (leaveTypeId = null).
 *
 * DIRECT_MANAGER → employee.managerId
 * DEPARTMENT_HEAD → employee.department.managerId
 * HR_MANAGER → first user with HR_MANAGER role in the company
 * SPECIFIC_ROLE → first user with that roleId
 * SPECIFIC_USER → approverId directly
 */
export async function resolveApproversForStep(
  leaveRequestId: string,
  step: number,
  tx?: PrismaTypes.TransactionClient
): Promise<ResolvedApprover[]> {
  const db = tx ?? prisma;

  const request = await db.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    include: {
      employee: {
        include: {
          department: true,
          manager: { select: { userId: true, firstName: true, lastName: true } },
        },
      },
      leaveType: true,
    },
  });

  if (!request) throw new Error("Leave request not found");

  // Find config: type-specific first, then company-wide
  const config =
    (await db.leaveApprovalConfig.findFirst({
      where: { companyId: request.employee.companyId, leaveTypeId: request.leaveTypeId, step },
    })) ??
    (await db.leaveApprovalConfig.findFirst({
      where: { companyId: request.employee.companyId, leaveTypeId: null, step },
    }));

  if (!config) return [];

  switch (config.approverType) {
    case "DIRECT_MANAGER": {
      const mgr = request.employee.manager;
      if (!mgr?.userId) return [];
      return [{ userId: mgr.userId, name: `${mgr.firstName} ${mgr.lastName}`, step, approverType: config.approverType }];
    }

    case "DEPARTMENT_HEAD": {
      const dept = request.employee.department;
      if (!dept?.managerId) return [];
      const deptMgr = await db.employee.findUnique({
        where: { id: dept.managerId },
        select: { userId: true, firstName: true, lastName: true },
      });
      if (!deptMgr?.userId) return [];
      return [{ userId: deptMgr.userId, name: `${deptMgr.firstName} ${deptMgr.lastName}`, step, approverType: config.approverType }];
    }

    case "HR_MANAGER": {
      // Find first user with an HR role in this company
      const hrProfile = await db.userProfile.findFirst({
        where: { companyId: request.employee.companyId, role: "HR_MANAGER", isActive: true },
        select: { userId: true },
      });
      if (!hrProfile?.userId) return [];
      return [{ userId: hrProfile.userId, name: "HR Manager", step, approverType: config.approverType }];
    }

    case "SPECIFIC_ROLE": {
      if (!config.approverRoleId) return [];
      // Find a user assigned this custom role
      const roleUser = await db.userRole.findFirst({
        where: { roleId: config.approverRoleId },
        select: { userId: true },
      });
      if (!roleUser?.userId) return [];
      return [{ userId: roleUser.userId, name: "Role Approver", step, approverType: config.approverType }];
    }

    case "SPECIFIC_USER": {
      if (!config.approverId) return [];
      return [{ userId: config.approverId, name: "Designated Approver", step, approverType: config.approverType }];
    }

    default:
      return [];
  }
}

/**
 * Returns the maximum configured approval step for this leave type.
 * If no config exists, returns 1 (single-step approval).
 */
export async function getMaxApprovalSteps(
  companyId: string,
  leaveTypeId: string,
  tx?: PrismaTypes.TransactionClient
): Promise<number> {
  const db = tx ?? prisma;

  const configs = await db.leaveApprovalConfig.findMany({
    where: {
      companyId,
      OR: [{ leaveTypeId }, { leaveTypeId: null }],
    },
    orderBy: { step: "desc" },
    take: 1,
  });

  return configs[0]?.step ?? 1;
}

/**
 * Determines the next leave status after a step approval.
 *
 * - If step < maxSteps → IN_REVIEW (more approvals needed)
 * - If step === maxSteps → APPROVED (all steps done)
 * - If reliever is required and not yet accepted → PENDING_RELIEVER (injected before final approval)
 */
export function resolveStatusAfterApproval(
  currentStep: number,
  maxSteps: number,
  requiresReliever: boolean,
  relieverStatus: string
): LeaveStatus {
  if (currentStep < maxSteps) return "IN_REVIEW";

  // Final approval step
  if (requiresReliever && relieverStatus === "PENDING") {
    return "PENDING_RELIEVER";
  }
  return "APPROVED";
}

/**
 * Checks if a given userId is an authorized approver for the current step
 * of the given leave request.
 */
export async function isAuthorizedApprover(
  leaveRequestId: string,
  userId: string,
  tx?: PrismaTypes.TransactionClient
): Promise<boolean> {
  const db = tx ?? prisma;

  const request = await db.leaveRequest.findUnique({
    where: { id: leaveRequestId },
    select: { currentApprovalStep: true },
  });
  if (!request) return false;

  const approvers = await resolveApproversForStep(leaveRequestId, request.currentApprovalStep, db);
  return approvers.some((a) => a.userId === userId);
}
