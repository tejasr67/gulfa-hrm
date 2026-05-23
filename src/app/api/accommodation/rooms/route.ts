import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { createRoom } from "@/modules/accommodation/queries";
import { createRoomSchema } from "@/modules/accommodation/schema";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ACCOMMODATION:CREATE");
    const body = await req.json();
    const parsed = createRoomSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const room = await createRoom(session.companyId, parsed.data);
    return ok(room, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
