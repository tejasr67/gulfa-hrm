import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import {
  getSalaryAdvances,
  createSalaryAdvance,
  approveSalaryAdvance,
  rejectSalaryAdvance,
} from "@/modules/payroll/queries";
import { createSalaryAdvanceSchema } from "@/modules/payroll/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:VIEW");
    const advances = await getSalaryAdvances(session.companyId);
    return ok(advances);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    const body = await req.json();

    if (body.action === "approve" && body.id) {
      await requirePermission(session, "PAYROLL:APPROVE");
      const adv = await approveSalaryAdvance(body.id, session.companyId, session.userId);
      await writeAuditLog({ userId: session.userId, action: "APPROVE", module: "PAYROLL", entityId: adv.id, entityType: "SalaryAdvance" });
      return ok(adv);
    }

    if (body.action === "reject" && body.id) {
      await requirePermission(session, "PAYROLL:APPROVE");
      const adv = await rejectSalaryAdvance(body.id, session.companyId);
      await writeAuditLog({ userId: session.userId, action: "REJECT", module: "PAYROLL", entityId: adv.id, entityType: "SalaryAdvance" });
      return ok(adv);
    }

    await requirePermission(session, "PAYROLL:PROCESS");
    const parsed = createSalaryAdvanceSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const advance = await createSalaryAdvance(session.companyId, parsed.data, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "CREATE",
      module: "PAYROLL",
      entityId: advance.id,
      entityType: "SalaryAdvance",
      employeeId: parsed.data.employeeId,
      newValues: { amount: advance.amount },
    });
    return ok(advance, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
