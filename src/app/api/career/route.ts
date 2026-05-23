import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getRecentCareerEvents, createCareerEvent } from "@/modules/career/queries";
import { createCareerEventSchema } from "@/modules/career/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "CAREER:READ");
    const events = await getRecentCareerEvents(session.companyId);
    return ok(events);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "CAREER:CREATE");
    const body = await req.json();
    const parsed = createCareerEventSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const event = await createCareerEvent(session.companyId, parsed.data, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "CAREER_EVENT_CREATED",
      module: "CAREER",
      entityId: event.id,
      entityType: "CareerHistory",
      employeeId: parsed.data.employeeId,
      newValues: { type: parsed.data.type },
    });
    return ok(event, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
