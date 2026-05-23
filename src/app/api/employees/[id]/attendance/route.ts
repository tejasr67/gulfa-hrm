import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api/with-auth";

type Params = { params: Promise<{ id: string }> };

export const GET = async (req: NextRequest, { params }: Params) => {
  try {
    const session = await requireSession();
    const { companyId } = session;
    await requirePermission(session, "ATTENDANCE:READ");
    const { id } = await params;

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10), 200);
    const page = Math.max(parseInt(sp.get("page") ?? "1", 10), 1);
    const month = sp.get("month") ? parseInt(sp.get("month")!, 10) : undefined;
    const year = sp.get("year") ? parseInt(sp.get("year")!, 10) : undefined;

    const where = {
      employee: { id, companyId, deletedAt: null },
      ...(year && month
        ? {
            date: {
              gte: new Date(year, month - 1, 1),
              lte: new Date(year, month, 0),
            },
          }
        : year
        ? { date: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31) } }
        : {}),
    };

    const [total, records] = await Promise.all([
      prisma.attendanceRecord.count({ where }),
      prisma.attendanceRecord.findMany({
        where,
        select: {
          id: true,
          date: true,
          status: true,
          checkIn: true,
          checkOut: true,
          workHours: true,
          overtime: true,
          checkInMethod: true,
          notes: true,
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok({ data: records, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
};
