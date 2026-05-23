import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError, err } from "@/lib/api/response";
import { getEncashmentRequests } from "@/modules/leave/queries";
import { requestLeaveEncashment } from "@/modules/leave/actions";
import { encashmentRequestSchema } from "@/modules/leave/schema";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    await requirePermission(session, "LEAVE:READ");
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const requests = await getEncashmentRequests(session.companyId, status);
    return ok(requests);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    await requirePermission(session, "LEAVE:CREATE");
    const body = await request.json();
    const parsed = encashmentRequestSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0]?.message ?? "Invalid input");

    const result = await requestLeaveEncashment(parsed.data);
    if (!result.success) return err(result.error ?? "Failed");
    return ok({ id: result.id });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
