import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getAssetCategories, createAssetCategory } from "@/modules/assets/queries";
import { createAssetCategorySchema } from "@/modules/assets/schema";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "ASSETS:READ");
    const categories = await getAssetCategories(session.companyId);
    return ok(categories);
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
    const parsed = createAssetCategorySchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const cat = await createAssetCategory(session.companyId, parsed.data);
    return ok(cat, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
