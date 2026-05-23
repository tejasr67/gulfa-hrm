import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { assignRoom, vacateRoom } from "@/modules/accommodation/queries";
import { assignRoomSchema, vacateRoomSchema } from "@/modules/accommodation/schema";
import { writeAuditLog } from "@/lib/utils/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ACCOMMODATION:ASSIGN");
    const body = await req.json();

    if (body.action === "vacate") {
      const parsed = vacateRoomSchema.safeParse(body);
      if (!parsed.success) return err(parsed.error.issues[0].message);
      const result = await vacateRoom(session.companyId, parsed.data);
      await writeAuditLog({
        userId: session.userId,
        action: "ROOM_VACATED",
        module: "ACCOMMODATION",
        entityId: parsed.data.assignmentId,
        entityType: "AccommodationAssignment",
        newValues: { vacateNotes: parsed.data.vacateNotes },
      });
      return ok(result);
    }

    const parsed = assignRoomSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const result = await assignRoom(session.companyId, parsed.data, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "ROOM_ASSIGNED",
      module: "ACCOMMODATION",
      entityId: result.id,
      entityType: "AccommodationAssignment",
      employeeId: parsed.data.employeeId,
      newValues: { roomId: parsed.data.roomId },
    });
    return ok(result, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
