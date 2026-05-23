import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, notFound, serverError } from "@/lib/api/response";
import { getAsset, updateAsset, softDeleteAsset } from "@/modules/assets/queries";
import { updateAssetSchema } from "@/modules/assets/schema";
import { writeAuditLog } from "@/lib/utils/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:READ");
    const { id } = await params;
    const asset = await getAsset(id, session.companyId);
    if (!asset) return notFound("Asset");
    return ok(asset);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:UPDATE");
    const { id } = await params;
    const body = await req.json();
    const parsed = updateAssetSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const asset = await updateAsset(id, session.companyId, parsed.data);
    await writeAuditLog({ userId: session.userId, action: "UPDATE", module: "ASSETS", entityId: id, entityType: "Asset" });
    return ok(asset);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:DELETE");
    const { id } = await params;
    await softDeleteAsset(id, session.companyId);
    await writeAuditLog({ userId: session.userId, action: "DELETE", module: "ASSETS", entityId: id, entityType: "Asset" });
    return ok(null);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
