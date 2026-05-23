import { z } from "zod";

export const createCareerEventSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  type: z.enum(["PROMOTION", "DEMOTION", "TRANSFER", "ROLE_CHANGE", "SALARY_REVISION", "PROBATION_COMPLETION", "MANAGER_CHANGE"]),
  effectiveDate: z.string().min(1, "Effective date is required"),
  fromPosition: z.string().optional(),
  toPosition: z.string().optional(),
  fromDepartment: z.string().optional(),
  toDepartment: z.string().optional(),
  fromManagerId: z.string().optional(),
  toManagerId: z.string().optional(),
  fromLocationId: z.string().optional(),
  toLocationId: z.string().optional(),
  fromSalary: z.number().optional(),
  toSalary: z.number().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
  approvedBy: z.string().optional(),
});

export type CreateCareerEventInput = z.infer<typeof createCareerEventSchema>;
