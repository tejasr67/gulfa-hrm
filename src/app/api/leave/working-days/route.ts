import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError, err } from "@/lib/api/response";
import { calculateWorkingDays } from "@/lib/leave/working-days";
import { z } from "zod";

const querySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isHalfDay: z.coerce.boolean().optional().default(false),
});

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    await requirePermission(session, "LEAVE:READ");
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      startDate: url.searchParams.get("startDate"),
      endDate: url.searchParams.get("endDate"),
      isHalfDay: url.searchParams.get("isHalfDay"),
    });
    if (!parsed.success) return err("Invalid date parameters");

    const days = await calculateWorkingDays(
      session.companyId,
      parsed.data.startDate,
      parsed.data.endDate,
      parsed.data.isHalfDay
    );
    return ok({ days });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
