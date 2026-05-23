import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { previewSync } from "@/modules/uniforms/sync";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "UNIFORMS:READ");
    const { sheets } = (await req.json()) as { sheets: Record<string, unknown[][]> };
    if (!sheets) return err("sheets required");
    const result = await previewSync(session.companyId, sheets);
    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
