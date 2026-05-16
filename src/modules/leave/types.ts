import type { Prisma, LeaveStatus } from "@prisma/client";

export type LeaveRequestWithRelations = Prisma.LeaveRequestGetPayload<{
  include: {
    employee: {
      select: { id: true; firstName: true; lastName: true; photo: true; employeeId: true };
    };
    leaveType: true;
  };
}>;

export type LeaveBalanceSummary = Prisma.LeaveBalanceGetPayload<{
  include: { leaveType: true };
}>;

export type CreateLeaveRequestInput = {
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason?: string;
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
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
};
