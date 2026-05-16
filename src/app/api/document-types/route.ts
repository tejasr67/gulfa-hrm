import { requireSession } from "@/lib/auth/session";
import { ok, unauthorized, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireSession();
    const types = await prisma.documentType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, requiresExpiry: true, alertDaysBefore: true },
    });
    return ok(types);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
