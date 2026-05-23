import type {
  Prisma,
  LeaveStatus,
  RelieverStatus,
  HalfDayPeriod,
  ApproverType,
  ApprovalAction,
  EncashmentStatus,
} from "@prisma/client";

export type LeaveRequestWithRelations = Prisma.LeaveRequestGetPayload<{
  include: {
    employee: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        photo: true;
        employeeId: true;
        department: { select: { name: true } };
      };
    };
    leaveType: true;
    reliever: { select: { id: true; firstName: true; lastName: true; photo: true } };
    approvalActions: true;
  };
}>;

export type LeaveBalanceSummary = Prisma.LeaveBalanceGetPayload<{
  include: { leaveType: true };
}>;

export type LeaveTypeWithConfig = Prisma.LeaveTypeGetPayload<{
  include: { approvalConfigs: true };
}>;

export type LeaveApprovalActionWithRelations = Prisma.LeaveApprovalActionGetPayload<{}>;

export type LeaveEncashmentWithRelations = Prisma.LeaveEncashmentRequestGetPayload<{
  include: {
    employee: { select: { id: true; firstName: true; lastName: true; employeeId: true } };
    leaveType: { select: { id: true; name: true } };
  };
}>;

export type LeaveCarryForwardLogWithRelations = Prisma.LeaveCarryForwardLogGetPayload<{
  include: { leaveType: { select: { id: true; name: true } } };
}>;

export type CreateLeaveRequestInput = {
  employeeId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  isHalfDay?: boolean;
  halfDayPeriod?: HalfDayPeriod;
  reason?: string;
  relieverId?: string;
  attachments?: string[];
};

export type ApproveLeaveInput = {
  status: "APPROVED" | "REJECTED";
  rejectReason?: string;
};

export type LeaveFilters = {
  search?: string;
  status?: LeaveStatus;
  leaveTypeId?: string;
  employeeId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
};

export type LeaveCalendarEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  department: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: LeaveStatus;
};

export type LeaveStats = {
  pendingApprovals: number;
  onLeaveToday: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
};

export type LeaveAnalytics = {
  byLeaveType: Array<{ name: string; days: number; requests: number }>;
  byDepartment: Array<{ name: string; days: number; requests: number }>;
  byMonth: Array<{ month: string; days: number; requests: number }>;
  topTakers: Array<{ employeeName: string; employeeId: string; days: number }>;
};

// Re-export enums for convenience
export type { LeaveStatus, RelieverStatus, HalfDayPeriod, ApproverType, ApprovalAction, EncashmentStatus };
