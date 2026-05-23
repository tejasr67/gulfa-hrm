import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getEmployeeSalaries, upsertEmployeeSalary } from "@/modules/payroll/queries";
import { upsertEmployeeSalarySchema } from "@/modules/payroll/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:VIEW");
    const salaries = await getEmployeeSalaries(session.companyId);
    return ok(salaries);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:PROCESS");
    const body = await req.json();
    const parsed = upsertEmployeeSalarySchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const salary = await upsertEmployeeSalary(session.companyId, parsed.data, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "UPDATE",
      module: "PAYROLL",
      entityId: salary.id,
      entityType: "EmployeeSalary",
      employeeId: parsed.data.employeeId,
      newValues: { basicSalary: salary.basicSalary, totalSalary: salary.totalSalary },
    });
    return ok(salary, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
