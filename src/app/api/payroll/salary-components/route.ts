import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getSalaryComponents, createSalaryComponent, toggleSalaryComponent } from "@/modules/payroll/queries";
import { createSalaryComponentSchema } from "@/modules/payroll/schema";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:VIEW");
    const components = await getSalaryComponents(session.companyId);
    return ok(components);
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

    if (body.action === "toggle" && body.id) {
      const comp = await toggleSalaryComponent(body.id, session.companyId);
      return ok(comp);
    }

    const parsed = createSalaryComponentSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const comp = await createSalaryComponent(session.companyId, parsed.data);
    return ok(comp, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
