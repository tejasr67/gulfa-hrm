import { z } from "zod";

export const createLeaveRequestSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Leave type is required"),
    startDate: z.coerce.date({ error: "Start date is required" }),
    endDate: z.coerce.date({ error: "End date is required" }),
    reason: z.string().optional(),
    isHalfDay: z.boolean().optional().default(false),
    halfDayPeriod: z.enum(["MORNING", "AFTERNOON"]).optional(),
    relieverId: z.string().optional(),
    attachments: z.array(z.string()).optional().default([]),
  })
  .refine((d) => !d.isHalfDay || d.startDate.getTime() === d.endDate.getTime(), {
    message: "Half-day requests must start and end on the same day",
    path: ["endDate"],
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const approveLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectReason: z.string().optional(),
});

export const leaveApprovalConfigSchema = z.object({
  leaveTypeId: z.string().nullable().optional(),
  step: z.number().int().min(1).max(5),
  approverType: z.enum(["DIRECT_MANAGER", "DEPARTMENT_HEAD", "HR_MANAGER", "SPECIFIC_ROLE", "SPECIFIC_USER"]),
  approverRoleId: z.string().optional(),
  approverId: z.string().optional(),
  isRequired: z.boolean().default(true),
  timeoutHours: z.number().int().positive().optional(),
});

export const encashmentRequestSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  year: z.number().int().min(2020).max(2099),
  days: z.number().positive(),
});

export const leaveFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["PENDING", "PENDING_RELIEVER", "IN_REVIEW", "APPROVED", "REJECTED", "CANCELLED", "WITHDRAWN"]).optional(),
  leaveTypeId: z.string().optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateLeaveRequestFormData = z.infer<typeof createLeaveRequestSchema>;
export type ApproveLeaveFormData = z.infer<typeof approveLeaveSchema>;
export type LeaveFiltersInput = z.infer<typeof leaveFiltersSchema>;
