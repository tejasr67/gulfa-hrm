import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import {
  getDepartmentsForCompany,
  getLocationsForCompany,
  getPositionsForCompany,
  getManagersForCompany,
} from "@/modules/employees/queries";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:READ");
    const [departments, locations, positions, managers] = await Promise.all([
      getDepartmentsForCompany(session.companyId),
      getLocationsForCompany(session.companyId),
      getPositionsForCompany(session.companyId),
      getManagersForCompany(session.companyId),
    ]);
    return ok({ departments, locations, positions, managers });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
