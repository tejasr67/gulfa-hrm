import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { getEmployeeDocuments, createEmployeeDocument } from "@/modules/employees/queries";
import { writeAuditLog } from "@/lib/utils/audit";
import { createDocumentSchema } from "@/modules/employees/schema";
import { ok, err, unauthorized, forbidden, notFound, serverError } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:READ");
    const documents = await getEmployeeDocuments(id, session.companyId);
    return ok(documents);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Employee not found") return notFound("Employee");
    if (e instanceof Error && e.message === "Permission denied") return forbidden();
    return serverError(e);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:CREATE");

    const body = await request.json();
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);

    const doc = await createEmployeeDocument(id, session.companyId, parsed.data, session.userId);

    await writeAuditLog({
      userId: session.userId,
      action: "DOCUMENT_UPLOAD",
      module: "EMPLOYEES",
      entityId: doc.id,
      entityType: "EmployeeDocument",
      employeeId: id,
      newValues: { documentTypeId: parsed.data.documentTypeId, fileName: parsed.data.fileName },
    });

    return ok(doc, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Employee not found") return notFound("Employee");
    if (e instanceof Error && e.message === "Permission denied") return forbidden();
    return serverError(e);
  }
}
