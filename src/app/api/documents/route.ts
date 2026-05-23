import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getDocuments, createDocument } from "@/modules/documents/queries";
import { createDocumentSchema } from "@/modules/documents/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:READ");
    const { searchParams } = new URL(req.url);
    const result = await getDocuments(session.companyId, {
      employeeId: searchParams.get("employeeId") ?? undefined,
      documentTypeId: searchParams.get("documentTypeId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      expiry: (searchParams.get("expiry") ?? undefined) as "expired" | "expiring30" | "expiring60" | undefined,
      search: searchParams.get("search") ?? undefined,
      page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
    });
    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:CREATE");
    const body = await req.json();
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const doc = await createDocument(session.companyId, parsed.data, session.userId);
    await writeAuditLog({ userId: session.userId, action: "DOCUMENT_CREATED", module: "DOCUMENTS", entityId: doc.id, entityType: "EmployeeDocument", newValues: { employeeId: parsed.data.employeeId } });
    return ok(doc, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
