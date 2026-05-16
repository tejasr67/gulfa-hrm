import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getEmployeeTimeline } from "@/modules/employees/queries";
import { ok, unauthorized, notFound, serverError } from "@/lib/api/response";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await requireSession();
    const events = await getEmployeeTimeline(id, session.companyId);
    return ok(events);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message === "Employee not found") return notFound("Employee");
    return serverError(e);
  }
}
