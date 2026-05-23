import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { getEmployees, createEmployee } from "@/modules/employees/queries";
import { ok, unauthorized, forbidden, serverError, err } from "@/lib/api/response";
import { parseQueryParams, advancedEmployeeQuerySchema } from "@/lib/api/query-params";
import { createEmployeeSchema } from "@/modules/employees/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:READ");
    const parsed = parseQueryParams(advancedEmployeeQuerySchema, new URL(request.url).searchParams);
    if (!parsed.success) return err(parsed.error);

    const result = await getEmployees(session.companyId, parsed.data);
    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:CREATE");
    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues.map((i) => i.message).join(", "));

    const employee = await createEmployee(session.companyId, parsed.data, session.userId);
    return ok(employee, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
