import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { updateDocument, deleteDocument } from "@/modules/documents/queries";
import { updateDocumentSchema } from "@/modules/documents/schema";
import { writeAuditLog } from "@/lib/utils/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:UPDATE");
    const body = await req.json();
    const parsed = updateDocumentSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const doc = await updateDocument(id, session.companyId, parsed.data);
    await writeAuditLog({ userId: session.userId, action: "DOCUMENT_UPDATED", module: "DOCUMENTS", entityId: id, entityType: "EmployeeDocument" });
    return ok(doc);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:DELETE");
    await deleteDocument(id, session.companyId);
    await writeAuditLog({ userId: session.userId, action: "DOCUMENT_DELETED", module: "DOCUMENTS", entityId: id, entityType: "EmployeeDocument" });
    return ok({ deleted: true });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
