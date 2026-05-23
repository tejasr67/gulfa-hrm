import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getAssets, createAsset } from "@/modules/assets/queries";
import { createAssetSchema } from "@/modules/assets/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:READ");
    const { searchParams } = new URL(req.url);
    const assets = await getAssets(session.companyId, {
      categoryId: searchParams.get("categoryId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    return ok(assets);
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
    const parsed = createAssetSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const asset = await createAsset(session.companyId, parsed.data);
    await writeAuditLog({ userId: session.userId, action: "CREATE", module: "ASSETS", entityId: asset.id, entityType: "Asset", newValues: { name: asset.name, code: asset.code } });
    return ok(asset, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
