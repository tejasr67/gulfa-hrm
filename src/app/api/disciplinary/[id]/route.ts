import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { updateDisciplinaryRecord } from "@/modules/disciplinary/queries";
import { updateDisciplinaryRecordSchema } from "@/modules/disciplinary/schema";
import { writeAuditLog } from "@/lib/utils/audit";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "DISCIPLINARY:UPDATE");
    const body = await req.json();
    const parsed = updateDisciplinaryRecordSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const record = await updateDisciplinaryRecord(id, session.companyId, parsed.data);
    await writeAuditLog({ userId: session.userId, action: "DISCIPLINARY_RECORD_UPDATED", module: "DISCIPLINARY", entityId: id, entityType: "DisciplinaryRecord" });
    return ok(record);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
