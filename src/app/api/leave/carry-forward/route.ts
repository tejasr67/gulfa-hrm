import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError, err } from "@/lib/api/response";
import { processYearEndCarryForward } from "@/modules/leave/actions";
import { getCarryForwardSummary } from "@/modules/leave/queries";
import { z } from "zod";

const bodySchema = z.object({ year: z.number().int().min(2020).max(2099) });
const querySchema = z.object({ year: z.coerce.number().int().min(2020).max(2099) });

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    await requirePermission(session, "LEAVE:READ");
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({ year: url.searchParams.get("year") });
    if (!parsed.success) return err("Invalid year");

    const summary = await getCarryForwardSummary(session.companyId, parsed.data.year);
    return ok(summary);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    await requirePermission(session, "LEAVE:MANAGE");
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid body");

    const result = await processYearEndCarryForward(parsed.data.year);
    if (!result.success) return err(result.error ?? "Failed");
    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
