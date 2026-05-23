import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, err, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { updateBenefit } from "@/modules/benefits/queries";
import { updateBenefitSchema } from "@/modules/benefits/schema";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await requireSession();
    await requirePermission(session, "BENEFITS:UPDATE");
    const body = await req.json();
    const parsed = updateBenefitSchema.safeParse(body);
    if (!parsed.success) return err(parsed.error.issues[0].message);
    const benefit = await updateBenefit(id, session.companyId, parsed.data);
    return ok(benefit);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    if (e instanceof Error) return err(e.message);
    return serverError(e);
  }
}
