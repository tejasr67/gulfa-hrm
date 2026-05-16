import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { deleteEmployeeDocument } from "@/modules/employees/queries";
import { deleteStorageFile } from "@/lib/supabase/storage";
import { writeAuditLog } from "@/lib/utils/audit";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string; docId: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id, docId } = await params;
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:DELETE");

    const doc = await deleteEmployeeDocument(docId, id, session.companyId);

    if ((doc as any).storagePath) {
      await deleteStorageFile((doc as any).storagePath).catch((e) =>
        console.error("[Storage] delete failed:", (doc as any).storagePath, e)
      );
    }

    await writeAuditLog({
      userId: session.userId,
      action: "DOCUMENT_DELETE",
      module: "EMPLOYEES",
      entityId: docId,
      entityType: "EmployeeDocument",
      employeeId: id,
    });

    return ok(null);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Document not found") return notFound("Document");
    if (e instanceof Error && e.message === "Permission denied") return forbidden();
    return serverError(e);
  }
}
