import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getAccommodationStats } from "@/modules/accommodation/queries";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "ACCOMMODATION:READ");
    const stats = await getAccommodationStats(session.companyId);
    return ok(stats);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
