import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getEmployeeCareerHistory } from "@/modules/career/queries";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  try {
    const { employeeId } = await params;
    const session = await requireSession();
    await requirePermission(session, "CAREER:READ");
    const data = await getEmployeeCareerHistory(employeeId, session.companyId);
    if (!data) return err("Employee not found", 404);
    return ok(data);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
