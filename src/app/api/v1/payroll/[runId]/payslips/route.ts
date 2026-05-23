import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiKey, requireScope } from "@/lib/api/apikey";
import { v1Error } from "@/lib/api/response";

type Params = { params: Promise<{ runId: string }> };

// ── GET /api/v1/payroll/:runId/payslips ───────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireApiKey(req);
    requireScope(session, "payroll:read");
    const { runId } = await params;

    const run = await prisma.payrollRun.findFirst({
      where: { id: runId, companyId: session.companyId },
    });
    if (!run) {
      return NextResponse.json({ success: false, error: "Payroll run not found" }, { status: 404 });
    }

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get("limit") ?? "100", 10), 500);
    const cursor = sp.get("cursor") ?? undefined;

    const payslips = await prisma.payslip.findMany({
      where: { payrollRunId: runId },
      select: {
        id: true,
        basicSalary: true,
        housingAllowance: true,
        transportAllowance: true,
        foodAllowance: true,
        mobileAllowance: true,
        otherAllowances: true,
        overtime: true,
        grossSalary: true,
        deductions: true,
        unpaidLeaveDeduction: true,
        advanceDeduction: true,
        netSalary: true,
        workingDays: true,
        paidDays: true,
        status: true,
        paidAt: true,
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { employee: { lastName: "asc" } },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNext = payslips.length > limit;
    const items = hasNext ? payslips.slice(0, limit) : payslips;

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { limit, nextCursor: hasNext ? items.at(-1)?.id : null, hasNext },
      meta: {
        runId,
        period: { year: run.year, month: run.month },
        runStatus: run.status,
        totalAmount: run.totalAmount,
      },
    });
  } catch (e) {
    return v1Error(e);
  }
}
