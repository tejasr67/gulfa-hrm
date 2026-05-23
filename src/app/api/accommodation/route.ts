import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getAccommodations, createAccommodation } from "@/modules/accommodation/queries";
import { createAccommodationSchema } from "@/modules/accommodation/schema";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "ACCOMMODATION:READ");
    const data = await getAccommodations(session.companyId);
    return ok(data);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "ACCOMMODATION:CREATE");
    const body = await req.json();
    const parsed = createAccommodationSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const acc = await createAccommodation(session.companyId, parsed.data);
    return ok(acc, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
