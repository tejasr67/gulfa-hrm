import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, notFound, serverError } from "@/lib/api/response";
import {
  getPayrollRun,
  generatePayslips,
  approvePayrollRun,
  markPayrollRunPaid,
  cancelPayrollRun,
  getDepartmentPayrollBreakdown,
} from "@/modules/payroll/queries";
import { writeAuditLog } from "@/lib/utils/audit";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:VIEW");
    const { id } = await params;
    const run = await getPayrollRun(id, session.companyId);
    if (!run) return notFound("Payroll run");
    return ok(run);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const { action } = await req.json().catch(() => ({ action: "" }));

    if (action === "generate") {
      await requirePermission(session, "PAYROLL:PROCESS");
      const result = await generatePayslips(id, session.companyId, session.userId);
      await writeAuditLog({ userId: session.userId, action: "PROCESS", module: "PAYROLL", entityId: id, entityType: "PayrollRun", newValues: result });
      return ok(result);
    }

    if (action === "approve") {
      await requirePermission(session, "PAYROLL:APPROVE");
      const run = await approvePayrollRun(id, session.companyId, session.userId);
      await writeAuditLog({ userId: session.userId, action: "APPROVE", module: "PAYROLL", entityId: id, entityType: "PayrollRun" });
      return ok(run);
    }

    if (action === "pay") {
      await requirePermission(session, "PAYROLL:PAY");
      const run = await markPayrollRunPaid(id, session.companyId, { userId: session.userId });
      await writeAuditLog({ userId: session.userId, action: "PAY", module: "PAYROLL", entityId: id, entityType: "PayrollRun" });
      return ok(run);
    }

    if (action === "cancel") {
      await requirePermission(session, "PAYROLL:CANCEL");
      const run = await cancelPayrollRun(id, session.companyId);
      await writeAuditLog({ userId: session.userId, action: "CANCEL", module: "PAYROLL", entityId: id, entityType: "PayrollRun" });
      return ok(run);
    }

    if (action === "department-breakdown") {
      await requirePermission(session, "PAYROLL:VIEW");
      const breakdown = await getDepartmentPayrollBreakdown(id, session.companyId);
      return ok(breakdown);
    }

    return err("Unknown action");
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
