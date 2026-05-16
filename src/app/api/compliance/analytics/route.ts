import { requireSession } from "@/lib/auth/session";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import {
  getComplianceByDocType,
  getComplianceByDepartment,
  getExpiryForecast,
} from "@/modules/compliance/queries";

export async function GET() {
  try {
    const session = await requireSession();
    const [byDocType, byDepartment, forecast] = await Promise.all([
      getComplianceByDocType(session.companyId),
      getComplianceByDepartment(session.companyId),
      getExpiryForecast(session.companyId),
    ]);
    return ok({ byDocType, byDepartment, forecast });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
