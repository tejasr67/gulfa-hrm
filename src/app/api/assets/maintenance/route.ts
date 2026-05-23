import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getMaintenanceLogs, scheduleMaintenance, completeMaintenance, getMaintenanceAlerts } from "@/modules/assets/queries";
import { scheduleMaintenanceSchema, completeMaintenanceSchema } from "@/modules/assets/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:READ");
    const { searchParams } = new URL(req.url);
    if (searchParams.get("alerts") === "1") {
      const alerts = await getMaintenanceAlerts(session.companyId);
      return ok(alerts);
    }
    const logs = await getMaintenanceLogs(session.companyId, {
      status: searchParams.get("status") ?? undefined,
      assetId: searchParams.get("assetId") ?? undefined,
    });
    return ok(logs);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:CREATE");
    const body = await req.json();

    if (body.action === "complete") {
      const parsed = completeMaintenanceSchema.safeParse(body);
      if (!parsed.success) return err(parsed.error.issues[0].message);
      const log = await completeMaintenance(session.companyId, parsed.data);
      await writeAuditLog({ userId: session.userId, action: "MAINTENANCE_COMPLETED", module: "ASSETS", entityId: parsed.data.maintenanceId, entityType: "AssetMaintenance" });
      return ok(log);
    }

    const parsed = scheduleMaintenanceSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const log = await scheduleMaintenance(session.companyId, parsed.data, session.userId);
    await writeAuditLog({ userId: session.userId, action: "MAINTENANCE_SCHEDULED", module: "ASSETS", entityId: log.id, entityType: "AssetMaintenance", newValues: { assetId: parsed.data.assetId } });
    return ok(log, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
