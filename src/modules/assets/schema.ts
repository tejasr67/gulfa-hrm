import { z } from "zod";

export const createAssetCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  nameAr: z.string().optional(),
  icon: z.string().optional(),
});

export const createAssetSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Asset code is required"),
  serialNumber: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  depreciationRate: z.number().min(0).max(100).optional(),
  warrantyExpiry: z.string().optional(),
  replacementCycleMonths: z.number().int().min(1).optional(),
  location: z.string().optional(),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"]).default("GOOD"),
  notes: z.string().optional(),
});

export const updateAssetSchema = createAssetSchema.partial().extend({
  status: z.enum(["AVAILABLE", "ASSIGNED", "UNDER_MAINTENANCE", "RESERVED", "DISPOSED", "LOST"]).optional(),
});

export const issueAssetSchema = z.object({
  assetId: z.string().min(1),
  employeeId: z.string().min(1),
  expectedReturnDate: z.string().optional(),
  condition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"]).default("GOOD"),
  notes: z.string().optional(),
});

export const returnAssetSchema = z.object({
  assignmentId: z.string().min(1),
  returnCondition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"]),
  returnNotes: z.string().optional(),
});

export const scheduleMaintenanceSchema = z.object({
  assetId: z.string().min(1),
  type: z.enum(["ROUTINE", "REPAIR", "INSPECTION", "REPLACEMENT", "CALIBRATION"]),
  scheduledAt: z.string().min(1, "Scheduled date is required"),
  description: z.string().optional(),
  vendor: z.string().optional(),
  cost: z.number().min(0).optional(),
});

export const completeMaintenanceSchema = z.object({
  maintenanceId: z.string().min(1),
  completedAt: z.string().min(1),
  outcome: z.string().optional(),
  cost: z.number().min(0).optional(),
  nextMaintenanceAt: z.string().optional(),
  newCondition: z.enum(["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"]).optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
export type IssueAssetInput = z.infer<typeof issueAssetSchema>;
export type ReturnAssetInput = z.infer<typeof returnAssetSchema>;
export type ScheduleMaintenanceInput = z.infer<typeof scheduleMaintenanceSchema>;
export type CompleteMaintenanceInput = z.infer<typeof completeMaintenanceSchema>;
