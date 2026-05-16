import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import { getExpiringDocuments } from "@/modules/compliance/queries";
import type { ExpiryRisk } from "@/modules/compliance/types";

const VALID_RISKS: ExpiryRisk[] = ["expired", "critical", "warning", "ok"];

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const sp = new URL(request.url).searchParams;

    const risk = sp.get("risk") as ExpiryRisk | null;
    const departmentId = sp.get("departmentId") ?? undefined;
    const documentTypeId = sp.get("documentTypeId") ?? undefined;
    const page = parseInt(sp.get("page") ?? "1", 10);

    const result = await getExpiringDocuments(session.companyId, {
      riskLevels: risk && VALID_RISKS.includes(risk) ? [risk] : undefined,
      departmentId,
      documentTypeId,
      page,
      limit: 50,
    });

    return ok(result);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
