"use server";

import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { writeAuditLog } from "@/lib/utils/audit";
import {
  createAttendanceRecord,
  updateAttendanceRecord,
  approveOvertime,
  bulkCreateAttendance,
} from "./queries";
import {
  createAttendanceSchema,
  updateAttendanceSchema,
  approveOvertimeSchema,
  bulkAttendanceSchema,
} from "./schema";
import type { ApiResponse } from "@/types";

export async function createAttendanceRecordAction(data: unknown): Promise<ApiResponse<{ id: string }>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:CREATE");

    const parsed = createAttendanceSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    const record = await createAttendanceRecord(session.companyId, parsed.data, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "CREATE",
      module: "ATTENDANCE",
      entityId: record.id,
      entityType: "AttendanceRecord",
      employeeId: parsed.data.employeeId,
      newValues: { date: parsed.data.date, status: parsed.data.status },
    }).catch(() => {});

    return { data: { id: record.id }, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function updateAttendanceRecordAction(id: string, data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:UPDATE");

    const parsed = updateAttendanceSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    await updateAttendanceRecord(id, session.companyId, parsed.data);
    await writeAuditLog({
      userId: session.userId,
      action: "UPDATE",
      module: "ATTENDANCE",
      entityId: id,
      entityType: "AttendanceRecord",
      newValues: parsed.data,
    }).catch(() => {});

    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function approveOvertimeAction(id: string, data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:APPROVE");

    const parsed = approveOvertimeSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    await approveOvertime(id, session.companyId, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "APPROVE",
      module: "ATTENDANCE",
      entityId: id,
      entityType: "AttendanceRecord",
    }).catch(() => {});

    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function bulkImportAttendanceAction(data: unknown): Promise<ApiResponse<{ succeeded: number; failed: number; total: number }>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ATTENDANCE:CREATE");

    const parsed = bulkAttendanceSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    const result = await bulkCreateAttendance(session.companyId, parsed.data.records);
    await writeAuditLog({
      userId: session.userId,
      action: "BULK_IMPORT",
      module: "ATTENDANCE",
      entityId: session.companyId,
      entityType: "AttendanceRecord",
      newValues: result,
    }).catch(() => {});

    return { data: result, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}
