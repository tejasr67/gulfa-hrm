import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getDisciplinaryRecords, createDisciplinaryRecord } from "@/modules/disciplinary/queries";
import { createDisciplinaryRecordSchema } from "@/modules/disciplinary/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "DISCIPLINARY:READ");
    const { searchParams } = new URL(req.url);
    const records = await getDisciplinaryRecords(session.companyId, {
      status: searchParams.get("status") ?? undefined,
      typeId: searchParams.get("typeId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      employeeId: searchParams.get("employeeId") ?? undefined,
    });
    return ok(records);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "DISCIPLINARY:CREATE");
    const body = await req.json();
    const parsed = createDisciplinaryRecordSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const record = await createDisciplinaryRecord(session.companyId, parsed.data, session.userId);
    await writeAuditLog({ userId: session.userId, action: "DISCIPLINARY_RECORD_CREATED", module: "DISCIPLINARY", entityId: record.id, entityType: "DisciplinaryRecord" });
    return ok(record, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
