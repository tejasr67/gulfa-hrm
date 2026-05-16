"use server";

import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createEmployee, updateEmployee, softDeleteEmployee, archiveEmployee,
  restoreEmployee, changeEmployeeStatus, createEmployeeDocument,
  deleteEmployeeDocument,
} from "./queries";
import { createSignedUploadUrl, deleteStorageFile, buildStoragePath } from "@/lib/supabase/storage";
import { writeAuditLog, serializeForAudit } from "@/lib/utils/audit";
import {
  createEmployeeSchema, updateEmployeeSchema, statusTransitionSchema,
  createDocumentSchema, uploadUrlSchema,
} from "./schema";
import type { ApiResponse } from "@/types";
import type { Prisma } from "@prisma/client";

type Employee = Prisma.EmployeeGetPayload<Record<string, never>>;

// ── Employee CRUD ──────────────────────────────────────────────────────────

export async function createEmployeeAction(formData: unknown): Promise<ApiResponse<Employee>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:CREATE");

    const parsed = createEmployeeSchema.safeParse(formData);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    const employee = await createEmployee(session.companyId, parsed.data, session.userId);

    await writeAuditLog({
      userId: session.userId,
      action: "CREATE",
      module: "EMPLOYEES",
      entityId: employee.id,
      entityType: "Employee",
      employeeId: employee.id,
      newValues: serializeForAudit(employee as unknown as Record<string, unknown>),
    });

    return { data: employee, error: null, success: true };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to create employee", success: false };
  }
}

export async function updateEmployeeAction(id: string, formData: unknown): Promise<ApiResponse<Employee>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:UPDATE");

    const parsed = updateEmployeeSchema.safeParse(formData);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    // Capture old values for diff
    const { prisma } = await import("@/lib/prisma");
    const before = await prisma.employee.findFirst({
      where: { id, companyId: session.companyId },
    });
    if (!before) return { data: null, error: "Employee not found", success: false };

    const employee = await updateEmployee(id, session.companyId, parsed.data, session.userId);

    await writeAuditLog({
      userId: session.userId,
      action: "UPDATE",
      module: "EMPLOYEES",
      entityId: id,
      entityType: "Employee",
      employeeId: id,
      oldValues: serializeForAudit(before as unknown as Record<string, unknown>),
      newValues: serializeForAudit(parsed.data as Record<string, unknown>),
    });

    return { data: employee, error: null, success: true };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to update employee", success: false };
  }
}

export async function changeEmployeeStatusAction(
  id: string,
  formData: unknown
): Promise<ApiResponse<Employee>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:UPDATE");

    const parsed = statusTransitionSchema.safeParse(formData);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    const employee = await changeEmployeeStatus(
      id, session.companyId, parsed.data.newStatus,
      parsed.data.notes, parsed.data.terminationDate, session.userId
    );

    await writeAuditLog({
      userId: session.userId,
      action: "STATUS_CHANGE",
      module: "EMPLOYEES",
      entityId: id,
      entityType: "Employee",
      employeeId: id,
      newValues: { status: parsed.data.newStatus, notes: parsed.data.notes },
    });

    return { data: employee, error: null, success: true };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to change status", success: false };
  }
}

export async function archiveEmployeeAction(id: string): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:DELETE");

    await archiveEmployee(id, session.companyId, session.userId);

    await writeAuditLog({
      userId: session.userId,
      action: "ARCHIVE",
      module: "EMPLOYEES",
      entityId: id,
      entityType: "Employee",
      employeeId: id,
    });

    return { data: null, error: null, success: true };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to archive", success: false };
  }
}

export async function restoreEmployeeAction(id: string): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:UPDATE");

    await restoreEmployee(id, session.companyId, session.userId);

    await writeAuditLog({
      userId: session.userId,
      action: "RESTORE",
      module: "EMPLOYEES",
      entityId: id,
      entityType: "Employee",
      employeeId: id,
    });

    return { data: null, error: null, success: true };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to restore", success: false };
  }
}

export async function deleteEmployeeAction(id: string): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:DELETE");

    await softDeleteEmployee(id, session.companyId);

    await writeAuditLog({
      userId: session.userId,
      action: "DELETE",
      module: "EMPLOYEES",
      entityId: id,
      entityType: "Employee",
      employeeId: id,
    });

    return { data: null, error: null, success: true };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to delete", success: false };
  }
}

// ── Document actions ──────────────────────────────────────────────────────

export async function getDocumentUploadUrlAction(
  employeeId: string,
  fileInfo: unknown
): Promise<ApiResponse<{ signedUrl: string; token: string; storagePath: string }>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:CREATE");

    const parsed = uploadUrlSchema.safeParse(fileInfo);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    // Verify employee belongs to company
    const { prisma } = await import("@/lib/prisma");
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!emp) return { data: null, error: "Employee not found", success: false };

    const storagePath = buildStoragePath(session.companyId, employeeId, parsed.data.fileName);
    const result = await createSignedUploadUrl(storagePath);

    return { data: { signedUrl: result.signedUrl, token: result.token, storagePath }, error: null, success: true };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to generate upload URL", success: false };
  }
}

export async function saveDocumentAction(
  employeeId: string,
  formData: unknown
): Promise<ApiResponse<unknown>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:CREATE");

    const parsed = createDocumentSchema.safeParse(formData);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    const doc = await createEmployeeDocument(employeeId, session.companyId, parsed.data, session.userId);

    await writeAuditLog({
      userId: session.userId,
      action: "DOCUMENT_UPLOAD",
      module: "EMPLOYEES",
      entityId: doc.id,
      entityType: "EmployeeDocument",
      employeeId,
      newValues: { documentTypeId: parsed.data.documentTypeId, fileName: parsed.data.fileName },
    });

    return { data: doc, error: null, success: true };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to save document", success: false };
  }
}

export async function deleteDocumentAction(
  docId: string,
  employeeId: string
): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:DELETE");

    const doc = await deleteEmployeeDocument(docId, employeeId, session.companyId);

    // Delete from storage if a storagePath was saved
    if ((doc as any).storagePath) {
      await deleteStorageFile((doc as any).storagePath).catch((e) =>
        console.error("[Storage] delete failed for", (doc as any).storagePath, e)
      );
    }

    await writeAuditLog({
      userId: session.userId,
      action: "DOCUMENT_DELETE",
      module: "EMPLOYEES",
      entityId: docId,
      entityType: "EmployeeDocument",
      employeeId,
    });

    return { data: null, error: null, success: true };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to delete document", success: false };
  }
}
