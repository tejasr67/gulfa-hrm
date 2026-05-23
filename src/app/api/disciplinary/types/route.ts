import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getDisciplinaryTypes, createDisciplinaryType } from "@/modules/disciplinary/queries";
import { createDisciplinaryTypeSchema } from "@/modules/disciplinary/schema";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "DISCIPLINARY:READ");
    const types = await getDisciplinaryTypes(session.companyId);
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
    await requirePermission(session, "DISCIPLINARY:CREATE");
    const body = await req.json();
    const parsed = createDisciplinaryTypeSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const type = await createDisciplinaryType(session.companyId, parsed.data);
    return ok(type, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
