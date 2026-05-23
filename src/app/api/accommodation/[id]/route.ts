import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getAccommodation, updateAccommodation } from "@/modules/accommodation/queries";
import { updateAccommodationSchema } from "@/modules/accommodation/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "ACCOMMODATION:READ");
    const acc = await getAccommodation(id, session.companyId);
    if (!acc) return err("Accommodation not found", 404);
    return ok(acc);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "ACCOMMODATION:UPDATE");
    const body = await req.json();
    const parsed = updateAccommodationSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const acc = await updateAccommodation(id, session.companyId, parsed.data);
    await writeAuditLog({ userId: session.userId, action: "ACCOMMODATION_UPDATED", module: "ACCOMMODATION", entityId: id, entityType: "Accommodation", newValues: parsed.data });
    return ok(acc);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
