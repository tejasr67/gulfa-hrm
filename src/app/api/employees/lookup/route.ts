import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError, err } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

// GET /api/employees/lookup?q=EMP-0042  or  ?q=Ahmed
// Returns matching active employees with id + display fields
export async function GET(req: NextRequest) {
  try {
    const session = await requireSession();
    await requirePermission(session, "EMPLOYEES:READ");
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (!q) return err("Query required");

    const employees = await prisma.employee.findMany({
      where: {
        companyId: session.companyId,
        deletedAt: null,
        status: { not: "TERMINATED" },
        OR: [
          { employeeId: { contains: q, mode: "insensitive" } },
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        photo: true,
        department: { select: { name: true } },
        position: { select: { title: true } },
      },
      take: 8,
      orderBy: { employeeId: "asc" },
    });

    return ok(employees);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
}
