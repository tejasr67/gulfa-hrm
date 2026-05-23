import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, notFound, serverError } from "@/lib/api/response";
import { getPayslip, updatePayslip } from "@/modules/payroll/queries";
import { updatePayslipSchema } from "@/modules/payroll/schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:VIEW");
    const { id } = await params;
    const payslip = await getPayslip(id, session.companyId);
    if (!payslip) return notFound("Payslip");
    return ok(payslip);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:PROCESS");
    const { id } = await params;
    const body = await req.json();
    const parsed = updatePayslipSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

    const payslip = await updatePayslip(id, session.companyId, parsed.data);
    return ok(payslip);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
