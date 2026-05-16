import { z } from "zod";

export const createEmployeeSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  positionId: z.string().optional(),
  locationId: z.string().optional(),
  managerId: z.string().optional(),
  joiningDate: z.coerce.date({ error: "Joining date is required" }),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "FREELANCE"]),
  nationality: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"]).optional(),
  dateOfBirth: z.coerce.date().optional(),
  emiratesId: z.string().regex(/^\d{3}-\d{4}-\d{7}-\d{1}$/, "Invalid Emirates ID format (784-XXXX-XXXXXXX-X)").optional().or(z.literal("")),
  emiratesIdExpiry: z.coerce.date().optional(),
  visaNumber: z.string().optional(),
  visaExpiry: z.coerce.date().optional(),
  passportNumber: z.string().optional(),
  passportExpiry: z.coerce.date().optional(),
  laborCardNumber: z.string().optional(),
  laborCardExpiry: z.coerce.date().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  iban: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  status: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "PROBATION"]).optional(),
  terminationDate: z.coerce.date().optional(),
});

export const statusTransitionSchema = z.object({
  newStatus: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "PROBATION"]),
  notes: z.string().max(500).optional(),
  terminationDate: z.coerce.date().optional(),
}).refine(
  (d) => d.newStatus !== "TERMINATED" || !!d.terminationDate,
  { message: "Termination date is required when terminating", path: ["terminationDate"] }
);

export const createDocumentSchema = z.object({
  documentTypeId: z.string().min(1, "Document type is required"),
  documentNumber: z.string().optional(),
  issueDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  issuedBy: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024).optional(),
  mimeType: z.string().optional(),
  storagePath: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const uploadUrlSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().refine(
    (m) => ["application/pdf", "image/jpeg", "image/png", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(m),
    "File type not allowed. Use PDF, JPG, PNG, or DOC."
  ),
  fileSize: z.number().int().positive().max(10 * 1024 * 1024, "File must be under 10MB"),
});

export type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeFormData = z.infer<typeof updateEmployeeSchema>;
export type StatusTransitionFormData = z.infer<typeof statusTransitionSchema>;
export type CreateDocumentFormData = z.infer<typeof createDocumentSchema>;
export type UploadUrlFormData = z.infer<typeof uploadUrlSchema>;
