import type { Prisma } from "@prisma/client";

export type PayrollRunWithStats = Prisma.PayrollRunGetPayload<{
  include: { payslips: true };
}>;

export type PayslipWithDetails = Prisma.PayslipGetPayload<{
  include: {
    lineItems: true;
    employee: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        employeeId: true;
        department: { select: { name: true } };
        position: { select: { title: true } };
      };
    };
  };
}>;

export type SalaryComponentRow = Prisma.SalaryComponentGetPayload<Record<string, never>>;

export type EmployeeSalaryRow = Prisma.EmployeeSalaryGetPayload<{
  include: {
    employee: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        employeeId: true;
        department: { select: { name: true } };
        position: { select: { title: true } };
      };
    };
  };
}>;

export type SalaryAdvanceRow = Prisma.SalaryAdvanceGetPayload<{
  include: {
    employee: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        employeeId: true;
      };
    };
  };
}>;

export type PayrollStats = {
  totalPayrollCost: number;
  totalEmployees: number;
  avgSalary: number;
  pendingRuns: number;
  totalRuns: number;
  currency: string;
};

export type PayrollSummaryReport = {
  month: number;
  year: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  currency: string;
};

export type DepartmentPayrollBreakdown = {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  totalNet: number;
  avgSalary: number;
};

export type PayslipCalculationInput = {
  employeeId: string;
  payrollRunId: string;
  month: number;
  year: number;
  companyId: string;
};

export type PayslipLineItemInput = {
  name: string;
  type: "BASIC" | "ALLOWANCE" | "DEDUCTION" | "BONUS" | "OVERTIME" | "COMMISSION";
  amount: number;
  notes?: string;
};

export type CalculatedPayslip = {
  employeeId: string;
  payrollRunId: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  mobileAllowance: number;
  otherAllowances: number;
  overtime: number;
  commission: number;
  grossSalary: number;
  deductions: number;
  unpaidLeaveDeduction: number;
  advanceDeduction: number;
  netSalary: number;
  workingDays: number;
  paidDays: number;
  leaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  overtimeHours: number;
  lineItems: PayslipLineItemInput[];
};
