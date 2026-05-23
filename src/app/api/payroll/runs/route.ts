import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getPayrollRuns, createPayrollRun } from "@/modules/payroll/queries";
import { createPayrollRunSchema } from "@/modules/payroll/schema";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:VIEW");
    const runs = await getPayrollRuns(session.companyId);
    return ok(runs);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:CREATE");
    const body = await req.json();
    const parsed = createPayrollRunSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const run = await createPayrollRun(session.companyId, parsed.data);
    return ok(run, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
