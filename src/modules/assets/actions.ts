"use server";

import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { writeAuditLog } from "@/lib/utils/audit";
import {
  createAsset, updateAsset, softDeleteAsset,
  issueAsset, returnAsset,
  scheduleMaintenance, completeMaintenance,
  createAssetCategory,
} from "./queries";
import {
  createAssetSchema, updateAssetSchema,
  issueAssetSchema, returnAssetSchema,
  scheduleMaintenanceSchema, completeMaintenanceSchema,
  createAssetCategorySchema,
} from "./schema";
import type { ApiResponse } from "@/types";

// ── Categories ────────────────────────────────────────────────────────────────

export async function createAssetCategoryAction(data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:CREATE");
    const parsed = createAssetCategorySchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };
    const cat = await createAssetCategory(session.companyId, parsed.data);
    await writeAuditLog({ userId: session.userId, action: "CREATE", module: "ASSETS", entityId: cat.id, entityType: "AssetCategory", newValues: { name: cat.name } });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

// ── Assets ────────────────────────────────────────────────────────────────────

export async function createAssetAction(data: unknown): Promise<ApiResponse<{ id: string }>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:CREATE");
    const parsed = createAssetSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };
    const asset = await createAsset(session.companyId, parsed.data);
    await writeAuditLog({ userId: session.userId, action: "CREATE", module: "ASSETS", entityId: asset.id, entityType: "Asset", newValues: { name: asset.name, code: asset.code } });
    return { data: { id: asset.id }, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function updateAssetAction(id: string, data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:UPDATE");
    const parsed = updateAssetSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };
    await updateAsset(id, session.companyId, parsed.data);
    await writeAuditLog({ userId: session.userId, action: "UPDATE", module: "ASSETS", entityId: id, entityType: "Asset" });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function deleteAssetAction(id: string): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:DELETE");
    await softDeleteAsset(id, session.companyId);
    await writeAuditLog({ userId: session.userId, action: "DELETE", module: "ASSETS", entityId: id, entityType: "Asset" });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

// ── Issue / Return ────────────────────────────────────────────────────────────

export async function issueAssetAction(data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:ASSIGN");
    const parsed = issueAssetSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };
    const assignment = await issueAsset(session.companyId, parsed.data, session.userId);
    await writeAuditLog({ userId: session.userId, action: "ASSIGN", module: "ASSETS", entityId: assignment.id, entityType: "AssetAssignment", employeeId: parsed.data.employeeId, newValues: { assetId: parsed.data.assetId } });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function returnAssetAction(data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:ASSIGN");
    const parsed = returnAssetSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };
    await returnAsset(session.companyId, parsed.data, session.userId);
    await writeAuditLog({ userId: session.userId, action: "RETURN", module: "ASSETS", entityId: parsed.data.assignmentId, entityType: "AssetAssignment" });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

// ── Maintenance ───────────────────────────────────────────────────────────────

export async function scheduleMaintenanceAction(data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:CREATE");
    const parsed = scheduleMaintenanceSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };
    const log = await scheduleMaintenance(session.companyId, parsed.data, session.userId);
    await writeAuditLog({ userId: session.userId, action: "MAINTENANCE_SCHEDULED", module: "ASSETS", entityId: log.id, entityType: "AssetMaintenance", newValues: { assetId: parsed.data.assetId, type: parsed.data.type } });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function completeMaintenanceAction(data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:CREATE");
    const parsed = completeMaintenanceSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };
    await completeMaintenance(session.companyId, parsed.data);
    await writeAuditLog({ userId: session.userId, action: "MAINTENANCE_COMPLETED", module: "ASSETS", entityId: parsed.data.maintenanceId, entityType: "AssetMaintenance" });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}
