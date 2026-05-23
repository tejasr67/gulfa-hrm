import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError, err } from "@/lib/api/response";
import { getLeaveCalendar } from "@/modules/leave/queries";
import { z } from "zod";

const querySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  departmentId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    await requirePermission(session, "LEAVE:READ");
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      departmentId: url.searchParams.get("departmentId") ?? undefined,
    });
    if (!parsed.success) return err("Invalid date range");

    const entries = await getLeaveCalendar(
      session.companyId,
      parsed.data.from,
      parsed.data.to,
      parsed.data.departmentId
    );
    return ok(entries);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
