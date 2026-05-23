import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireSession();
    await requirePermission(session, "DOCUMENTS:READ");
    const types = await prisma.documentType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, requiresExpiry: true, alertDaysBefore: true },
    });
    return ok(types);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
