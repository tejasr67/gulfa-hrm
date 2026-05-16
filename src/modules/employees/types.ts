import type { Prisma } from "@prisma/client";
import type { EmploymentType, EmployeeStatus, Gender, MaritalStatus } from "@prisma/client";

// ── List item (used in EmployeeTable) ──────────────────────────────────────
export type EmployeeListItem = Prisma.EmployeeGetPayload<{
  select: {
    id: true; employeeId: true; firstName: true; lastName: true;
    email: true; phone: true; photo: true; status: true; employmentType: true;
    joiningDate: true; emiratesIdExpiry: true; visaExpiry: true; passportExpiry: true;
    laborCardExpiry: true; nationality: true; deletedAt: true;
    department: { select: { id: true; name: true } };
    position: { select: { title: true } };
    location: { select: { name: true } };
    manager: { select: { id: true; firstName: true; lastName: true } };
  };
}>;

// ── Full profile (used in detail page) ────────────────────────────────────
export type EmployeeWithRelations = Prisma.EmployeeGetPayload<{
  include: {
    department: true;
    position: true;
    location: true;
    manager: { select: { id: true; firstName: true; lastName: true; photo: true } };
    subordinates: { select: { id: true; firstName: true; lastName: true; employeeId: true; photo: true } };
    emergencyContacts: { where: { isActive: true } };
    documents: {
      where: { deletedAt: null };
      include: { documentType: true };
      orderBy: { expiryDate: "asc" };
    };
    salaries: { where: { isActive: true }; orderBy: { effectiveFrom: "desc" }; take: 1 };
    careerHistory: { orderBy: { effectiveDate: "desc" } };
    _count: { select: { emergencyContacts: true; documents: true; subordinates: true } };
  };
}>;

// ── Profile completeness ───────────────────────────────────────────────────
export type CompletenessSection = {
  name: string;
  score: number;
  maxScore: number;
};

export type ProfileCompletenessResult = {
  score: number; // 0-100
  sections: CompletenessSection[];
};

// ── Timeline ──────────────────────────────────────────────────────────────
export type TimelineEvent = {
  id: string;
  type: "AUDIT" | "CAREER" | "DOCUMENT" | "STATUS_CHANGE";
  action: string;
  description: string;
  performedBy?: string | null;
  createdAt: string; // ISO string — safe for serialization across server/client boundary
  metadata?: Record<string, unknown> | null;
};

// ── Document ──────────────────────────────────────────────────────────────
export type EmployeeDocumentWithType = Prisma.EmployeeDocumentGetPayload<{
  include: { documentType: true };
}>;

// ── Input types ───────────────────────────────────────────────────────────
export type CreateEmployeeInput = {
  firstName: string; lastName: string; email: string; phone?: string;
  departmentId?: string; positionId?: string; locationId?: string; managerId?: string;
  joiningDate: Date; employmentType: EmploymentType;
  nationality?: string; gender?: Gender; maritalStatus?: MaritalStatus;
  dateOfBirth?: Date; emiratesId?: string; emiratesIdExpiry?: Date;
  visaNumber?: string; visaExpiry?: Date; passportNumber?: string; passportExpiry?: Date;
  laborCardNumber?: string; laborCardExpiry?: Date;
  bankName?: string; bankAccount?: string; iban?: string;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput> & {
  status?: EmployeeStatus;
  terminationDate?: Date;
};

export type EmployeeFilters = {
  search?: string; departmentId?: string; status?: EmployeeStatus;
  employmentType?: EmploymentType; locationId?: string; nationality?: string;
  managerId?: string; expiryStatus?: "expired" | "expiring_soon";
  joiningDateFrom?: Date; joiningDateTo?: Date; includeArchived?: boolean;
  sortBy?: "name" | "joiningDate" | "status" | "employeeId" | "department";
  sortOrder?: "asc" | "desc";
  page?: number; limit?: number;
};

export type CreateDocumentInput = {
  documentTypeId: string;
  documentNumber?: string;
  issueDate?: Date;
  expiryDate?: Date;
  issuedBy?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storagePath?: string;
  notes?: string;
};

export type StatusTransitionInput = {
  newStatus: EmployeeStatus;
  notes?: string;
  terminationDate?: Date;
};
