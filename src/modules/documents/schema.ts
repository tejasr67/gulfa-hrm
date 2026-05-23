import { z } from "zod";

export const createDocumentSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  documentTypeId: z.string().min(1, "Document type is required"),
  documentNumber: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  issuedBy: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDocumentSchema = z.object({
  documentNumber: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  issuedBy: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
