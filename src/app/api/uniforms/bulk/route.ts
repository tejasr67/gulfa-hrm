import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { bulkUpdateStock } from "@/modules/uniforms/bulk";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "UNIFORMS:UPDATE");
    const body = await req.json();
    const { rows } = body as { rows: unknown[] };
    if (!Array.isArray(rows) || rows.length === 0) return err("No rows provided");
    if (rows.length > 500) return err("Max 500 rows per import");
    const results = await bulkUpdateStock(session.companyId, rows);
    return ok(results);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
