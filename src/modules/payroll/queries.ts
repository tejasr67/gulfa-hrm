import "server-only";
import { prisma } from "@/lib/prisma";
import { calculatePayslip } from "./engine";
import type {
  PayrollStats,
  PayrollSummaryReport,
  DepartmentPayrollBreakdown,
} from "./types";
import type {
  CreatePayrollRunInput,
  CreateSalaryComponentInput,
  UpsertEmployeeSalaryInput,
  CreateSalaryAdvanceInput,
  UpdatePayslipInput,
} from "./schema";

// ── Payroll Runs ──────────────────────────────────────────────────────────────

export async function getPayrollRuns(companyId: string) {
  return prisma.payrollRun.findMany({
    where: { companyId },
    include: {
      _count: { select: { payslips: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
}

export async function getPayrollRun(id: string, companyId: string) {
  return prisma.payrollRun.findFirst({
    where: { id, companyId },
    include: {
      payslips: {
        include: {
          lineItems: true,
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeId: true,
              department: { select: { name: true } },
              position: { select: { title: true } },
            },
          },
        },
        orderBy: { employee: { lastName: "asc" } },
      },
    },
  });
}

export async function createPayrollRun(companyId: string, data: CreatePayrollRunInput) {
  return prisma.payrollRun.create({
    data: { companyId, ...data },
  });
}

export async function generatePayslips(payrollRunId: string, companyId: string, processedBy?: string) {
  const run = await prisma.payrollRun.findFirst({
    where: { id: payrollRunId, companyId },
  });
  if (!run) throw new Error("Payroll run not found");
  if (run.status !== "DRAFT") throw new Error("Can only generate payslips for DRAFT runs");

  // Get all active employees with salaries (include email for notifications)
  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      status: "ACTIVE",
      salaries: { some: { isActive: true } },
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  await prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: { status: "PROCESSING" },
  });

  type EmployeeCalcResult = {
    employeeId: string;
    email: string | null;
    firstName: string;
    lastName: string;
    basicSalary: number;
    grossSalary: number;
    netSalary: number;
    currency: string;
  };
  const succeeded_results: EmployeeCalcResult[] = [];

  const results = await Promise.allSettled(
    employees.map(async (emp) => {
      try {
        const calc = await calculatePayslip(emp.id, payrollRunId, run.month, run.year);

        const payslip = await prisma.payslip.upsert({
          where: { payrollRunId_employeeId: { payrollRunId, employeeId: emp.id } },
          create: {
            payrollRunId,
            employeeId: emp.id,
            basicSalary: calc.basicSalary,
            housingAllowance: calc.housingAllowance,
            transportAllowance: calc.transportAllowance,
            foodAllowance: calc.foodAllowance,
            mobileAllowance: calc.mobileAllowance,
            otherAllowances: calc.otherAllowances,
            overtime: calc.overtime,
            commission: calc.commission,
            grossSalary: calc.grossSalary,
            deductions: calc.deductions,
            unpaidLeaveDeduction: calc.unpaidLeaveDeduction,
            advanceDeduction: calc.advanceDeduction,
            netSalary: calc.netSalary,
            workingDays: calc.workingDays,
            paidDays: calc.paidDays,
            leaveDays: calc.leaveDays,
            unpaidLeaveDays: calc.unpaidLeaveDays,
            absentDays: calc.absentDays,
            overtimeHours: calc.overtimeHours,
          },
          update: {
            basicSalary: calc.basicSalary,
            housingAllowance: calc.housingAllowance,
            transportAllowance: calc.transportAllowance,
            foodAllowance: calc.foodAllowance,
            mobileAllowance: calc.mobileAllowance,
            otherAllowances: calc.otherAllowances,
            overtime: calc.overtime,
            commission: calc.commission,
            grossSalary: calc.grossSalary,
            deductions: calc.deductions,
            unpaidLeaveDeduction: calc.unpaidLeaveDeduction,
            advanceDeduction: calc.advanceDeduction,
            netSalary: calc.netSalary,
            workingDays: calc.workingDays,
            paidDays: calc.paidDays,
            leaveDays: calc.leaveDays,
            unpaidLeaveDays: calc.unpaidLeaveDays,
            absentDays: calc.absentDays,
            overtimeHours: calc.overtimeHours,
          },
        });

        // Replace line items
        await prisma.payslipLineItem.deleteMany({ where: { payslipId: payslip.id } });
        if (calc.lineItems.length > 0) {
          await prisma.payslipLineItem.createMany({
            data: calc.lineItems.map((li) => ({ ...li, payslipId: payslip.id })),
          });
        }

        succeeded_results.push({
          employeeId: emp.id,
          email: emp.email,
          firstName: emp.firstName,
          lastName: emp.lastName,
          basicSalary: calc.basicSalary,
          grossSalary: calc.grossSalary,
          netSalary: calc.netSalary,
          currency: run.currency,
        });
      } catch (err) {
        console.error(`[Payroll] Failed for employee ${emp.id}:`, err);
        throw err;
      }
    })
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  const succeeded = succeeded_results.length;

  // Aggregate totals
  const totals = await prisma.payslip.aggregate({
    where: { payrollRunId },
    _sum: { netSalary: true },
  });

  // After generation: status is PROCESSING (payslips generated, awaiting approval).
  // If all employees failed, reset to DRAFT so HR can retry.
  const finalStatus = succeeded === 0 && failed > 0 ? "DRAFT" : "PROCESSING";

  await prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: {
      status: finalStatus,
      totalAmount: totals._sum.netSalary ?? 0,
      processedAt: new Date(),
      processedBy: processedBy ?? null,
    },
  });

  // Fire-and-forget: send payslip-ready notifications to each employee
  if (succeeded > 0) {
    const { notifyPayslipsBulk } = await import("@/lib/notifications/triggers/payroll");
    notifyPayslipsBulk(
      succeeded_results
        .filter((r) => !!r.email)
        .map((r) => ({
          companyId,
          employeeId: r.employeeId,
          employeeEmail: r.email!,
          employeeName: `${r.firstName} ${r.lastName}`.trim(),
          month: run.month,
          year: run.year,
          basicSalary: r.basicSalary,
          totalSalary: r.grossSalary,
          currency: r.currency,
          netPay: r.netSalary,
        }))
    ).catch((e) => console.error("[Payroll] notifyPayslipsBulk failed:", e));
  }

  return { succeeded, failed, total: employees.length };
}

export async function approvePayrollRun(id: string, companyId: string, approvedBy: string) {
  const run = await prisma.payrollRun.findFirst({ where: { id, companyId } });
  if (!run) throw new Error("Payroll run not found");
  if (!["DRAFT", "PROCESSING"].includes(run.status)) throw new Error("Only runs with generated payslips can be approved");

  return prisma.payrollRun.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: new Date(), approvedBy },
  });
}

export async function markPayrollRunPaid(
  id: string,
  companyId: string,
  paidBy?: { userId: string; email?: string; name?: string }
) {
  const run = await prisma.payrollRun.findFirst({
    where: { id, companyId },
    include: { company: { select: { name: true, email: true } } },
  });
  if (!run) throw new Error("Payroll run not found");
  if (run.status !== "APPROVED") throw new Error("Only APPROVED runs can be marked as paid");

  let payslipCount = 0;

  await prisma.$transaction(async (tx) => {
    const payslips = await tx.payslip.findMany({ where: { payrollRunId: id } });
    payslipCount = payslips.length;

    await tx.payslip.updateMany({
      where: { payrollRunId: id },
      data: { status: "PAID", paidAt: new Date() },
    });

    for (const ps of payslips) {
      if (ps.advanceDeduction > 0) {
        await tx.salaryAdvance.updateMany({
          where: { employeeId: ps.employeeId, status: "APPROVED" },
          data: { status: "DEDUCTED", deductedIn: ps.id },
        });
      }
    }

    await tx.payrollRun.update({
      where: { id },
      data: { status: "PAID" },
    });
  });

  // Fire-and-forget: generate payslip PDFs and store in Supabase
  generatePayslipPdfsForRun(id, companyId).catch((e) =>
    console.error("[Payroll] PDF generation failed:", e)
  );

  // Fire-and-forget: notify HR that payroll is complete
  const hrEmail = paidBy?.email ?? run.company.email;
  if (hrEmail) {
    const { notifyPayrollComplete } = await import("@/lib/notifications/triggers/payroll");
    notifyPayrollComplete({
      companyId,
      hrEmail,
      hrName: paidBy?.name,
      month: run.month,
      year: run.year,
      totalEmployees: payslipCount,
      totalAmount: run.totalAmount ?? 0,
      currency: run.currency,
    }).catch((e) => console.error("[Payroll] notifyPayrollComplete failed:", e));
  }

  return prisma.payrollRun.findUnique({ where: { id } });
}

export async function cancelPayrollRun(id: string, companyId: string) {
  const run = await prisma.payrollRun.findFirst({ where: { id, companyId } });
  if (!run) throw new Error("Payroll run not found");
  if (run.status === "PAID") throw new Error("Cannot cancel a paid payroll run");

  return prisma.payrollRun.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
}

// ── Payslips ──────────────────────────────────────────────────────────────────

export async function getPayslip(id: string, companyId: string) {
  return prisma.payslip.findFirst({
    where: {
      id,
      payrollRun: { companyId },
    },
    include: {
      lineItems: true,
      payrollRun: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          department: { select: { name: true } },
          position: { select: { title: true } },
        },
      },
    },
  });
}

export async function getEmployeePayslips(employeeId: string, companyId: string) {
  return prisma.payslip.findMany({
    where: {
      employeeId,
      payrollRun: { companyId },
    },
    include: {
      lineItems: true,
      payrollRun: true,
    },
    orderBy: { payrollRun: { year: "desc" } },
  });
}

export async function updatePayslip(id: string, companyId: string, data: UpdatePayslipInput) {
  const payslip = await prisma.payslip.findFirst({
    where: { id, payrollRun: { companyId } },
    include: { payrollRun: { select: { status: true, currency: true } } },
  });
  if (!payslip) throw new Error("Payslip not found");
  if (payslip.payrollRun.status === "PAID") throw new Error("Cannot edit a paid payslip");

  const commission = data.commission ?? payslip.commission;
  const overtimeHours = data.overtimeHours ?? payslip.overtimeHours;

  // Recalculate overtime amount if hours changed
  let overtime = payslip.overtime;
  if (data.overtimeHours !== undefined || data.overtime !== undefined) {
    overtime = data.overtime ?? payslip.overtime;
  }

  const grossSalary =
    payslip.basicSalary +
    payslip.housingAllowance +
    payslip.transportAllowance +
    payslip.foodAllowance +
    payslip.mobileAllowance +
    payslip.otherAllowances +
    overtime +
    commission;

  const netSalary = grossSalary - payslip.unpaidLeaveDeduction - payslip.advanceDeduction;

  return prisma.payslip.update({
    where: { id },
    data: {
      commission,
      overtime,
      overtimeHours,
      grossSalary: Math.round(grossSalary * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      notes: data.notes ?? payslip.notes,
    },
    include: { lineItems: true, payrollRun: true, employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } } },
  });
}

// ── PDF Generation ────────────────────────────────────────────────────────────

const PAYSLIPS_BUCKET = "payslips";
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function generatePayslipHtml(payslip: {
  employee: { firstName: string; lastName: string; employeeId: string; department?: { name: string } | null; position?: { title: string } | null };
  payrollRun: { month: number; year: number; currency: string };
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  mobileAllowance: number;
  otherAllowances: number;
  commission: number;
  overtime: number;
  grossSalary: number;
  unpaidLeaveDeduction: number;
  advanceDeduction: number;
  deductions: number;
  netSalary: number;
  workingDays: number;
  paidDays: number;
  overtimeHours: number;
  lineItems: { name: string; type: string; amount: number }[];
  companyName?: string;
}): string {
  const { employee, payrollRun, lineItems, companyName } = payslip;
  const currency = payrollRun.currency;
  const monthName = MONTH_NAMES[payrollRun.month - 1] ?? `Month ${payrollRun.month}`;
  const fmt = (n: number) => n.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const earnings = lineItems.filter((li) => li.amount > 0);
  const deductionItems = lineItems.filter((li) => li.amount < 0);

  const earningRows = earnings.map((li) => `
    <tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151">${li.name}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#111827">${currency} ${fmt(li.amount)}</td></tr>`).join("");

  const deductionRows = deductionItems.map((li) => `
    <tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#374151">${li.name}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;color:#dc2626">(${currency} ${fmt(Math.abs(li.amount))})</td></tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Payslip — ${employee.firstName} ${employee.lastName} — ${monthName} ${payrollRun.year}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { font-family: system-ui, -apple-system, sans-serif; background: #f9fafb; margin: 0; padding: 24px; color: #111827; }
  .container { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
  .header { background: #1e3a5f; color: #fff; padding: 24px 32px; }
  .header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .header p { margin: 0; font-size: 14px; opacity: 0.85; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding: 24px 32px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
  .meta-item label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6b7280; margin-bottom: 2px; }
  .meta-item span { font-size: 14px; color: #111827; }
  .section { padding: 20px 32px; }
  .section h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; color: #6b7280; margin: 0 0 12px; letter-spacing: 0.05em; }
  table { width: 100%; border-collapse: collapse; }
  .totals-row td { padding: 10px 12px; font-weight: 700; background: #f9fafb; border-top: 2px solid #e5e7eb; }
  .net-pay { background: #ecfdf5; padding: 20px 32px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #d1fae5; }
  .net-pay .label { font-size: 14px; font-weight: 600; color: #065f46; }
  .net-pay .amount { font-size: 24px; font-weight: 800; color: #059669; }
  .footer { padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; display: flex; justify-content: space-between; }
</style></head><body>
<div class="container">
  <div class="header">
    <h1>${companyName ?? "Payslip"}</h1>
    <p>Salary Statement — ${monthName} ${payrollRun.year}</p>
  </div>
  <div class="meta">
    <div class="meta-item"><label>Employee</label><span>${employee.firstName} ${employee.lastName}</span></div>
    <div class="meta-item"><label>Employee ID</label><span>${employee.employeeId}</span></div>
    <div class="meta-item"><label>Department</label><span>${employee.department?.name ?? "—"}</span></div>
    <div class="meta-item"><label>Position</label><span>${employee.position?.title ?? "—"}</span></div>
    <div class="meta-item"><label>Pay Period</label><span>${monthName} ${payrollRun.year}</span></div>
    <div class="meta-item"><label>Working / Paid Days</label><span>${payslip.workingDays} / ${payslip.paidDays}</span></div>
  </div>
  <div class="section">
    <h2>Earnings</h2>
    <table><tbody>${earningRows}</tbody>
    <tfoot><tr class="totals-row"><td>Total Earnings</td><td style="text-align:right">${currency} ${fmt(payslip.grossSalary)}</td></tr></tfoot></table>
  </div>
  ${deductionRows ? `<div class="section">
    <h2>Deductions</h2>
    <table><tbody>${deductionRows}</tbody>
    <tfoot><tr class="totals-row"><td>Total Deductions</td><td style="text-align:right;color:#dc2626">(${currency} ${fmt(payslip.deductions)})</td></tr></tfoot></table>
  </div>` : ""}
  <div class="net-pay">
    <span class="label">Net Pay</span>
    <span class="amount">${currency} ${fmt(payslip.netSalary)}</span>
  </div>
  <div class="footer">
    <span>Generated by Gulfa HRM</span>
    <span>${new Date().toLocaleDateString("en-AE")}</span>
  </div>
</div>
</body></html>`;
}

export async function generatePayslipPdfsForRun(payrollRunId: string, companyId: string): Promise<void> {
  const run = await prisma.payrollRun.findFirst({
    where: { id: payrollRunId, companyId },
    include: { company: { select: { name: true } } },
  });
  if (!run) return;

  const payslips = await prisma.payslip.findMany({
    where: { payrollRunId },
    include: {
      lineItems: true,
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          department: { select: { name: true } },
          position: { select: { title: true } },
        },
      },
    },
  });

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  for (const ps of payslips) {
    try {
      const html = generatePayslipHtml({
        ...ps,
        payrollRun: run,
        companyName: run.company.name,
      });

      const path = `${companyId}/${payrollRunId}/${ps.employeeId}.html`;
      const { error } = await supabase.storage
        .from(PAYSLIPS_BUCKET)
        .upload(path, html, { contentType: "text/html; charset=utf-8", upsert: true });

      if (error) {
        console.error(`[Payroll PDF] Upload failed for ${ps.id}:`, error.message);
        continue;
      }

      await prisma.payslip.update({
        where: { id: ps.id },
        data: { fileUrl: path },
      });
    } catch (e) {
      console.error(`[Payroll PDF] Failed for payslip ${ps.id}:`, e);
    }
  }
}

// ── Salary Components ─────────────────────────────────────────────────────────

export async function getSalaryComponents(companyId: string) {
  return prisma.salaryComponent.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function createSalaryComponent(companyId: string, data: CreateSalaryComponentInput) {
  return prisma.salaryComponent.create({
    data: { companyId, ...data },
  });
}

export async function toggleSalaryComponent(id: string, companyId: string) {
  const comp = await prisma.salaryComponent.findFirst({ where: { id, companyId } });
  if (!comp) throw new Error("Component not found");
  return prisma.salaryComponent.update({
    where: { id },
    data: { isActive: !comp.isActive },
  });
}

// ── Employee Salaries ─────────────────────────────────────────────────────────

export async function getEmployeeSalaries(companyId: string, activeOnly = true) {
  return prisma.employeeSalary.findMany({
    where: {
      employee: { companyId },
      ...(activeOnly ? { isActive: true } : {}),
    },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
          department: { select: { name: true } },
          position: { select: { title: true } },
        },
      },
    },
    orderBy: { employee: { lastName: "asc" } },
  });
}

export async function upsertEmployeeSalary(companyId: string, data: UpsertEmployeeSalaryInput, createdBy: string) {
  const commission = data.commission ?? 0;
  const totalSalary =
    data.basicSalary +
    data.housingAllowance +
    data.transportAllowance +
    data.foodAllowance +
    data.mobileAllowance +
    data.otherAllowances +
    commission;

  await prisma.employeeSalary.updateMany({
    where: { employeeId: data.employeeId, isActive: true },
    data: { isActive: false, effectiveTo: new Date(data.effectiveFrom) },
  });

  return prisma.employeeSalary.create({
    data: {
      employeeId: data.employeeId,
      basicSalary: data.basicSalary,
      housingAllowance: data.housingAllowance,
      transportAllowance: data.transportAllowance,
      foodAllowance: data.foodAllowance,
      mobileAllowance: data.mobileAllowance,
      otherAllowances: data.otherAllowances,
      commission,
      totalSalary,
      currency: data.currency,
      effectiveFrom: new Date(data.effectiveFrom),
      isActive: true,
      createdBy,
    },
  });
}

// ── Salary Advances ───────────────────────────────────────────────────────────

export async function getSalaryAdvances(companyId: string) {
  return prisma.salaryAdvance.findMany({
    where: { companyId },
    include: {
      employee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createSalaryAdvance(companyId: string, data: CreateSalaryAdvanceInput, createdBy: string) {
  return prisma.salaryAdvance.create({
    data: { companyId, createdBy, ...data },
  });
}

export async function approveSalaryAdvance(id: string, companyId: string, approvedBy: string) {
  const advance = await prisma.salaryAdvance.findFirst({ where: { id, companyId } });
  if (!advance) throw new Error("Advance not found");
  if (advance.status !== "PENDING") throw new Error("Only pending advances can be approved");

  return prisma.salaryAdvance.update({
    where: { id },
    data: { status: "APPROVED", approvedBy, approvedAt: new Date() },
  });
}

export async function rejectSalaryAdvance(id: string, companyId: string) {
  const advance = await prisma.salaryAdvance.findFirst({ where: { id, companyId } });
  if (!advance) throw new Error("Advance not found");
  if (advance.status !== "PENDING") throw new Error("Only pending advances can be rejected");

  return prisma.salaryAdvance.update({
    where: { id },
    data: { status: "REJECTED" },
  });
}

// ── Stats & Reports ───────────────────────────────────────────────────────────

export async function getPayrollStats(companyId: string): Promise<PayrollStats> {
  const [runs, salaryAgg] = await Promise.all([
    prisma.payrollRun.findMany({
      where: { companyId },
      select: { status: true },
    }),
    prisma.employeeSalary.aggregate({
      where: { employee: { companyId }, isActive: true },
      _sum: { totalSalary: true },
      _count: { id: true },
      _avg: { totalSalary: true },
    }),
  ]);

  const pendingRuns = runs.filter((r) =>
    ["DRAFT", "PROCESSING"].includes(r.status)
  ).length;

  return {
    totalPayrollCost: salaryAgg._sum.totalSalary ?? 0,
    totalEmployees: salaryAgg._count.id,
    avgSalary: salaryAgg._avg.totalSalary ?? 0,
    pendingRuns,
    totalRuns: runs.length,
    currency: "AED",
  };
}

export async function getPayrollHistory(companyId: string): Promise<PayrollSummaryReport[]> {
  const runs = await prisma.payrollRun.findMany({
    where: { companyId, status: { in: ["APPROVED", "PAID"] } },
    include: {
      _count: { select: { payslips: true } },
      payslips: {
        select: { grossSalary: true, deductions: true, netSalary: true },
      },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  return runs.map((run) => ({
    month: run.month,
    year: run.year,
    totalGross: run.payslips.reduce((s, p) => s + p.grossSalary, 0),
    totalDeductions: run.payslips.reduce((s, p) => s + p.deductions, 0),
    totalNet: run.payslips.reduce((s, p) => s + p.netSalary, 0),
    employeeCount: run._count.payslips,
    currency: run.currency,
  }));
}

export async function getDepartmentPayrollBreakdown(
  payrollRunId: string,
  companyId: string
): Promise<DepartmentPayrollBreakdown[]> {
  const payslips = await prisma.payslip.findMany({
    where: { payrollRunId, payrollRun: { companyId } },
    include: {
      employee: {
        select: {
          department: { select: { id: true, name: true } },
        },
      },
    },
  });

  const map = new Map<string, DepartmentPayrollBreakdown>();
  for (const ps of payslips) {
    const dept = ps.employee.department;
    if (!dept) continue;
    const existing = map.get(dept.id) ?? {
      departmentId: dept.id,
      departmentName: dept.name,
      employeeCount: 0,
      totalNet: 0,
      avgSalary: 0,
    };
    existing.employeeCount++;
    existing.totalNet += ps.netSalary;
    map.set(dept.id, existing);
  }

  return Array.from(map.values()).map((d) => ({
    ...d,
    avgSalary: d.employeeCount > 0 ? d.totalNet / d.employeeCount : 0,
  }));
}
