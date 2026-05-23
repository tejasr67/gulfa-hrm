import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, notFound, serverError } from "@/lib/api/response";
import { getLeaveRequestById } from "@/modules/leave/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    await requirePermission(session, "LEAVE:READ");
    const { id } = await params;
    const request = await getLeaveRequestById(id, session.companyId);
    if (!request) return notFound();
    return ok(request);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
