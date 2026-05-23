import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey, requireScope } from "@/lib/api/apikey";
import { v1Error } from "@/lib/api/response";

// ── GET /api/v1/payroll ───────────────────────────────────────────────────────
// Query: ?year=2025&month=5&status=PAID&cursor=<id>&limit=20

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "payroll:read");

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get("limit") ?? "20", 10), 100);
    const cursor = sp.get("cursor") ?? undefined;
    const year = sp.get("year") ? parseInt(sp.get("year")!, 10) : undefined;
    const month = sp.get("month") ? parseInt(sp.get("month")!, 10) : undefined;
    const status = sp.get("status") ?? undefined;

    const runs = await prisma.payrollRun.findMany({
      where: {
        companyId: session.companyId,
        ...(year ? { year } : {}),
        ...(month ? { month } : {}),
        ...(status ? { status: status as never } : {}),
      },
      select: {
        id: true,
        month: true,
        year: true,
        status: true,
        totalAmount: true,
        currency: true,
        processedAt: true,
        approvedAt: true,
        _count: { select: { payslips: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNext = runs.length > limit;
    const items = hasNext ? runs.slice(0, limit) : runs;

    return NextResponse.json({
      success: true,
      data: items.map((r) => ({
        id: r.id,
        period: { year: r.year, month: r.month },
        status: r.status,
        totalAmount: r.totalAmount,
        currency: r.currency,
        employeeCount: r._count.payslips,
        processedAt: r.processedAt,
        approvedAt: r.approvedAt,
      })),
      pagination: { limit, nextCursor: hasNext ? items.at(-1)?.id : null, hasNext },
    });
  } catch (e) {
    return v1Error(e);
  }
}
