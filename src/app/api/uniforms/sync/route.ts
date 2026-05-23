import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { syncFromMasterFile } from "@/modules/uniforms/sync";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "UNIFORMS:UPDATE");
    const body = await req.json();
    // body.sheets: { [sheetName]: unknown[][] }  (raw aoa from SheetJS on the client)
    const { sheets } = body as { sheets: Record<string, unknown[][]> };
    if (!sheets || typeof sheets !== "object") return err("sheets payload required");
    const result = await syncFromMasterFile(session.companyId, sheets);
    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
