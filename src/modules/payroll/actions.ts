"use server";

import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { writeAuditLog } from "@/lib/utils/audit";
import {
  createPayrollRun,
  generatePayslips,
  approvePayrollRun,
  markPayrollRunPaid,
  cancelPayrollRun,
  createSalaryComponent,
  upsertEmployeeSalary,
  createSalaryAdvance,
  approveSalaryAdvance,
  rejectSalaryAdvance,
} from "./queries";
import {
  createPayrollRunSchema,
  createSalaryComponentSchema,
  upsertEmployeeSalarySchema,
  createSalaryAdvanceSchema,
} from "./schema";
import type { ApiResponse } from "@/types";

// ── Payroll Runs ──────────────────────────────────────────────────────────────

export async function createPayrollRunAction(data: unknown): Promise<ApiResponse<{ id: string }>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:CREATE");

    const parsed = createPayrollRunSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    const run = await createPayrollRun(session.companyId, parsed.data);
    await writeAuditLog({
      userId: session.userId,
      action: "CREATE",
      module: "PAYROLL",
      entityId: run.id,
      entityType: "PayrollRun",
      newValues: { month: run.month, year: run.year },
    });
    return { data: { id: run.id }, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function generatePayslipsAction(payrollRunId: string): Promise<ApiResponse<{ succeeded: number; failed: number; total: number }>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:PROCESS");

    const result = await generatePayslips(payrollRunId, session.companyId, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "PROCESS",
      module: "PAYROLL",
      entityId: payrollRunId,
      entityType: "PayrollRun",
      newValues: result,
    });
    return { data: result, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function approvePayrollRunAction(payrollRunId: string): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:APPROVE");

    await approvePayrollRun(payrollRunId, session.companyId, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "APPROVE",
      module: "PAYROLL",
      entityId: payrollRunId,
      entityType: "PayrollRun",
    });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function markPayrollPaidAction(payrollRunId: string): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:PAY");

    await markPayrollRunPaid(payrollRunId, session.companyId, { userId: session.userId });
    await writeAuditLog({
      userId: session.userId,
      action: "PAY",
      module: "PAYROLL",
      entityId: payrollRunId,
      entityType: "PayrollRun",
    });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function cancelPayrollRunAction(payrollRunId: string): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:CANCEL");

    await cancelPayrollRun(payrollRunId, session.companyId);
    await writeAuditLog({
      userId: session.userId,
      action: "CANCEL",
      module: "PAYROLL",
      entityId: payrollRunId,
      entityType: "PayrollRun",
    });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

// ── Salary Components ─────────────────────────────────────────────────────────

export async function createSalaryComponentAction(data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:PROCESS");

    const parsed = createSalaryComponentSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    const comp = await createSalaryComponent(session.companyId, parsed.data);
    await writeAuditLog({
      userId: session.userId,
      action: "CREATE",
      module: "PAYROLL",
      entityId: comp.id,
      entityType: "SalaryComponent",
      newValues: { name: comp.name, type: comp.type },
    });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

// ── Employee Salaries ─────────────────────────────────────────────────────────

export async function upsertEmployeeSalaryAction(data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:PROCESS");

    const parsed = upsertEmployeeSalarySchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    const salary = await upsertEmployeeSalary(session.companyId, parsed.data, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "UPDATE",
      module: "PAYROLL",
      entityId: salary.id,
      entityType: "EmployeeSalary",
      employeeId: parsed.data.employeeId,
      newValues: { basicSalary: salary.basicSalary, totalSalary: salary.totalSalary },
    });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

// ── Salary Advances ───────────────────────────────────────────────────────────

export async function createSalaryAdvanceAction(data: unknown): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:PROCESS");

    const parsed = createSalaryAdvanceSchema.safeParse(data);
    if (!parsed.success) return { data: null, error: parsed.error.issues[0].message, success: false };

    const advance = await createSalaryAdvance(session.companyId, parsed.data, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "CREATE",
      module: "PAYROLL",
      entityId: advance.id,
      entityType: "SalaryAdvance",
      employeeId: parsed.data.employeeId,
      newValues: { amount: advance.amount, month: advance.month, year: advance.year },
    });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function approveSalaryAdvanceAction(advanceId: string): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:APPROVE");

    await approveSalaryAdvance(advanceId, session.companyId, session.userId);
    await writeAuditLog({
      userId: session.userId,
      action: "APPROVE",
      module: "PAYROLL",
      entityId: advanceId,
      entityType: "SalaryAdvance",
    });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}

export async function rejectSalaryAdvanceAction(advanceId: string): Promise<ApiResponse<null>> {
  try {
    const session = await requireSession();
    await requirePermission(session, "PAYROLL:APPROVE");

    await rejectSalaryAdvance(advanceId, session.companyId);
    await writeAuditLog({
      userId: session.userId,
      action: "REJECT",
      module: "PAYROLL",
      entityId: advanceId,
      entityType: "SalaryAdvance",
    });
    return { data: null, error: null, success: true };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Failed", success: false };
  }
}
