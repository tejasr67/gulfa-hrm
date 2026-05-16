import "server-only";
import { prisma } from "@/lib/prisma";

type WriteAuditParams = {
  userId: string;
  action: string;         // e.g. "CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "DOCUMENT_UPLOAD"
  module: string;         // e.g. "EMPLOYEES"
  entityId: string;       // the employee/document id
  entityType: string;     // e.g. "Employee", "EmployeeDocument"
  employeeId?: string;    // the Employee record this audit is FOR
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
};

// Non-blocking audit write — failure must never fail the main operation
export async function writeAuditLog(params: WriteAuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        module: params.module,
        entityId: params.entityId,
        entityType: params.entityType,
        employeeId: params.employeeId ?? null,
        // Prisma's Json type requires explicit cast — Record<string,unknown> satisfies InputJsonValue at runtime
        oldValues: (params.oldValues ?? undefined) as never,
        newValues: (params.newValues ?? undefined) as never,
      },
    });
  } catch (e) {
    console.error("[AuditLog] write failed:", params.action, params.entityId, e);
  }
}

// Pick only serializable scalar fields — strips Date objects, Buffers, etc.
export function serializeForAudit(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v === null || typeof v !== "object" || v instanceof Date
      ? true
      : false
    ).map(([k, v]) => [k, v instanceof Date ? v.toISOString() : v])
  );
}
