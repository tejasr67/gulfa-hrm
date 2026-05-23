import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { getIssuances, createIssuance, returnIssuance } from "@/modules/uniforms/queries";

export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "UNIFORMS:READ");
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const data = await getIssuances(session.companyId, { employeeId, category });
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
    await requirePermission(session, "UNIFORMS:CREATE");
    const body = await req.json();

    if (body.action === "return") {
      const { id, returnNotes } = body;
      if (!id) return err("id is required");
      await returnIssuance(id, session.companyId, returnNotes);
      return ok({ returned: true });
    }

    const { employeeId, category, size, color = "", location, qty, notes } = body;
    if (!employeeId || !category || !size || !location) {
      return err("employeeId, category, size, and location are required");
    }
    const issuance = await createIssuance(session.companyId, {
      employeeId,
      category: String(category).toUpperCase(),
      size: String(size),
      color: String(color),
      location: String(location),
      qty: Number(qty) || 1,
      notes: notes || undefined,
      issuedBy: session.userId,
    });
    return ok(issuance, 201);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
