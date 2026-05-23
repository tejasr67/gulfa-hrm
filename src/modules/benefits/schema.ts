import { z } from "zod";

export const createBenefitTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nameAr: z.string().optional(),
  description: z.string().optional(),
});

export const assignBenefitSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  benefitTypeId: z.string().min(1, "Benefit type is required"),
  value: z.number().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateBenefitSchema = z.object({
  value: z.number().optional(),
  endDate: z.string().optional().nullable(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateBenefitTypeInput = z.infer<typeof createBenefitTypeSchema>;
export type AssignBenefitInput = z.infer<typeof assignBenefitSchema>;
export type UpdateBenefitInput = z.infer<typeof updateBenefitSchema>;
