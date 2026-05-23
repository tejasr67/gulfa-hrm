import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { ok, unauthorized, forbidden, serverError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export const GET = async (req: NextRequest, { params }: Params) => {
  try {
    const session = await requireSession();
    const { companyId } = session;
    await requirePermission(session, "PAYROLL:VIEW");
    const { id } = await params;

    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get("limit") ?? "24", 10), 100);
    const page = Math.max(parseInt(sp.get("page") ?? "1", 10), 1);

    const where = {
      employeeId: id,
      payrollRun: { companyId },
    };

    const [total, payslips] = await Promise.all([
      prisma.payslip.count({ where }),
      prisma.payslip.findMany({
        where,
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
          payrollRun: { select: { id: true, month: true, year: true, status: true, currency: true } },
        },
        orderBy: [{ payrollRun: { year: "desc" } }, { payrollRun: { month: "desc" } }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return ok({ data: payslips, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    if (e instanceof Error && e.message.startsWith("Permission denied")) return forbidden();
    return serverError(e);
  }
};
