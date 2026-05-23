import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError, err } from "@/lib/api/response";
import { getLeaveRequests } from "@/modules/leave/queries";
import { leaveFiltersSchema } from "@/modules/leave/schema";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    await requirePermission(session, "LEAVE:READ");
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());

    const parsed = leaveFiltersSchema.safeParse(params);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid filters");

    const data = await getLeaveRequests(session.companyId, parsed.data);
    return ok(data);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
