import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getEmployees } from "@/modules/employees/queries";
import { ok, unauthorized, serverError, err } from "@/lib/api/response";
import { parseQueryParams, advancedEmployeeQuerySchema } from "@/lib/api/query-params";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = parseQueryParams(advancedEmployeeQuerySchema, new URL(request.url).searchParams);
    if (!parsed.success) return err(parsed.error);

    const result = await getEmployees(session.companyId, parsed.data);
    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
