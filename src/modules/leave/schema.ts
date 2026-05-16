import { z } from "zod";

// totalDays is NOT in this schema — it is a derived value computed server-side
// by a UAE-aware working-days calculator (accounts for company weekend config +
// public holidays). Server actions must compute it before calling createLeaveRequest().
export const createLeaveRequestSchema = z
  .object({
    leaveTypeId: z.string().min(1, "Leave type is required"),
    startDate: z.coerce.date({ error: "Start date is required" }),
    endDate: z.coerce.date({ error: "End date is required" }),
    reason: z.string().optional(),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export const approveLeaveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectReason: z.string().optional(),
});

export type CreateLeaveRequestFormData = z.infer<typeof createLeaveRequestSchema>;
export type ApproveLeaveFormData = z.infer<typeof approveLeaveSchema>;
