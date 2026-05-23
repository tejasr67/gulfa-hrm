import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getDocumentTypes, createDocumentType } from "@/modules/documents/queries";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:READ");
    const types = await getDocumentTypes();
    return ok(types);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "SETTINGS:UPDATE");
    const body = await req.json();
    if (!body.name?.trim()) return err("Name is required");
    const type = await createDocumentType({ name: body.name.trim(), nameAr: body.nameAr || undefined, requiresExpiry: body.requiresExpiry ?? true });
    return ok(type, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
