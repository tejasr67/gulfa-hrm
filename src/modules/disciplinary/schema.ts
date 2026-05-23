import { z } from "zod";

export const createDisciplinaryTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  severity: z.enum(["MINOR", "MODERATE", "MAJOR", "CRITICAL"]),
});

export const createDisciplinaryRecordSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  typeId: z.string().min(1, "Type is required"),
  incidentDate: z.string().min(1, "Incident date is required"),
  description: z.string().min(1, "Description is required"),
  action: z.string().min(1, "Action taken is required"),
  actionDate: z.string().optional(),
});

export const updateDisciplinaryRecordSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "APPEALED"]).optional(),
  appealStatus: z.enum(["PENDING", "ACCEPTED", "REJECTED"]).optional().nullable(),
  appealReason: z.string().optional(),
  appealDate: z.string().optional(),
  action: z.string().optional(),
  actionDate: z.string().optional(),
});

export type CreateDisciplinaryTypeInput = z.infer<typeof createDisciplinaryTypeSchema>;
export type CreateDisciplinaryRecordInput = z.infer<typeof createDisciplinaryRecordSchema>;
export type UpdateDisciplinaryRecordInput = z.infer<typeof updateDisciplinaryRecordSchema>;
