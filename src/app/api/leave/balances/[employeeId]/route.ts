import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError, err } from "@/lib/api/response";
import { getLeaveBalances } from "@/modules/leave/queries";
import { z } from "zod";

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2099).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const session = await requireSession();
    await requirePermission(session, "LEAVE:READ");
    const { employeeId } = await params;
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ year: url.searchParams.get("year") });
    if (!parsed.success) return err("Invalid year parameter");

    const year = parsed.data.year ?? new Date().getFullYear();
    const balances = await getLeaveBalances(employeeId, year);
    return ok(balances);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
