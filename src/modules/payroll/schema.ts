import { z } from "zod";

export const createPayrollRunSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  notes: z.string().optional(),
});

export const updatePayrollRunSchema = z.object({
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "PROCESSING", "APPROVED", "PAID", "CANCELLED"]).optional(),
});

export const createSalaryComponentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  nameAr: z.string().optional(),
  type: z.enum(["BASIC", "ALLOWANCE", "DEDUCTION", "BONUS", "OVERTIME", "COMMISSION"]),
  calculationType: z.enum(["FIXED", "PERCENTAGE"]),
  isActive: z.boolean().default(true),
});

export const upsertEmployeeSalarySchema = z.object({
  employeeId: z.string().min(1),
  basicSalary: z.number().min(0),
  housingAllowance: z.number().min(0).default(0),
  transportAllowance: z.number().min(0).default(0),
  foodAllowance: z.number().min(0).default(0),
  mobileAllowance: z.number().min(0).default(0),
  otherAllowances: z.number().min(0).default(0),
  commission: z.number().min(0).default(0),
  currency: z.string().default("AED"),
  effectiveFrom: z.string().min(1, "Effective from date is required"),
});

export const createSalaryAdvanceSchema = z.object({
  employeeId: z.string().min(1),
  amount: z.number().positive("Amount must be positive"),
  reason: z.string().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

export const updatePayslipSchema = z.object({
  notes: z.string().optional(),
  commission: z.number().min(0).optional(),
  overtime: z.number().min(0).optional(),
  overtimeHours: z.number().min(0).optional(),
});

export type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>;
export type CreateSalaryComponentInput = z.infer<typeof createSalaryComponentSchema>;
export type UpsertEmployeeSalaryInput = z.infer<typeof upsertEmployeeSalarySchema>;
export type CreateSalaryAdvanceInput = z.infer<typeof createSalaryAdvanceSchema>;
export type UpdatePayslipInput = z.infer<typeof updatePayslipSchema>;
