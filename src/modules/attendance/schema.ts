import { z } from "zod";

export const createAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.coerce.date({ error: "Date is required" }),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  shiftId: z.string().optional(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LATE", "ON_LEAVE", "HOLIDAY", "WEEKEND", "REMOTE"]),
  notes: z.string().optional(),
  workHours: z.coerce.number().min(0).max(24).optional(),
  overtime: z.coerce.number().min(0).max(24).optional(),
});

export const updateAttendanceSchema = z.object({
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  shiftId: z.string().optional(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LATE", "ON_LEAVE", "HOLIDAY", "WEEKEND", "REMOTE"]).optional(),
  notes: z.string().optional(),
  workHours: z.coerce.number().min(0).max(24).optional(),
  overtime: z.coerce.number().min(0).max(24).optional(),
});

export const approveOvertimeSchema = z.object({
  approvedBy: z.string().min(1, "Approver is required"),
});

export const bulkAttendanceSchema = z.object({
  records: z.array(
    z.object({
      employeeId: z.string().min(1),
      date: z.coerce.date(),
      status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LATE", "ON_LEAVE", "HOLIDAY", "WEEKEND", "REMOTE"]),
      checkIn: z.string().optional(),
      checkOut: z.string().optional(),
      notes: z.string().optional(),
    })
  ).min(1, "At least one record is required"),
});

export const attendanceFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LATE", "ON_LEAVE", "HOLIDAY", "WEEKEND", "REMOTE"]).optional(),
  employeeId: z.string().optional(),
  departmentId: z.string().optional(),
  shiftId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;
export type AttendanceFiltersInput = z.infer<typeof attendanceFiltersSchema>;
