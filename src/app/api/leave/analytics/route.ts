import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getLeaveAnalytics } from "@/modules/leave/queries";
import { z } from "zod";

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2099).optional(),
  departmentId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    await requirePermission(session, "REPORTS:READ");
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      year: url.searchParams.get("year"),
      departmentId: url.searchParams.get("departmentId"),
    });
    const year = parsed.data?.year ?? new Date().getFullYear();
    const deptId = parsed.data?.departmentId;

    const analytics = await getLeaveAnalytics(session.companyId, year, deptId);
    return ok(analytics);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
