import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getActiveAssignments, getEmployeeAssets, issueAsset, returnAsset } from "@/modules/assets/queries";
import { issueAssetSchema, returnAssetSchema } from "@/modules/assets/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:READ");
    const employeeId = new URL(req.url).searchParams.get("employeeId");
    if (employeeId) {
      const assignments = await getEmployeeAssets(employeeId, session.companyId);
      return ok(assignments);
    }
    const assignments = await getActiveAssignments(session.companyId);
    return ok(assignments);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();

    if (body.action === "return") {
      await requirePermission(session, "ASSETS:ASSIGN");
      const parsed = returnAssetSchema.safeParse(body);
      if (!parsed.success) return err(parsed.error.issues[0].message);
      const result = await returnAsset(session.companyId, parsed.data, session.userId);
      await writeAuditLog({ userId: session.userId, action: "RETURN", module: "ASSETS", entityId: parsed.data.assignmentId, entityType: "AssetAssignment" });
      return ok(result);
    }

    await requirePermission(session, "ASSETS:ASSIGN");
    const parsed = issueAssetSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const assignment = await issueAsset(session.companyId, parsed.data, session.userId);
    await writeAuditLog({ userId: session.userId, action: "ASSIGN", module: "ASSETS", entityId: assignment.id, entityType: "AssetAssignment", employeeId: parsed.data.employeeId });
    return ok(assignment, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
