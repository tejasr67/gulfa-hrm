"use client";

import { DollarSign, AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatCurrency } from "@/lib/utils/formatters";
import { useEmployeePayslips } from "@/modules/employees/hooks";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function PayrollTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error } = useEmployeePayslips(employeeId);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {["Period", "Basic", "Gross", "Deductions", "Net Salary", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b">
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-20" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No payslips"
        description="Payslips will appear here once payroll has been processed."
      />
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Basic</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Gross</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Deductions</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Net Salary</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((payslip) => (
            <tr key={payslip.id} className="border-b hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium">
                  {MONTH_NAMES[payslip.payrollRun.month - 1]} {payslip.payrollRun.year}
                </p>
                <p className="text-xs text-muted-foreground">
                  {payslip.workingDays}d working · {payslip.paidDays}d paid
                </p>
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm">
                {formatCurrency(payslip.basicSalary, payslip.payrollRun.currency)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm">
                {formatCurrency(payslip.grossSalary, payslip.payrollRun.currency)}
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-destructive">
                {payslip.deductions > 0
                  ? `−${formatCurrency(payslip.deductions, payslip.payrollRun.currency)}`
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right font-mono font-semibold">
                {formatCurrency(payslip.netSalary, payslip.payrollRun.currency)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={payslip.status} type="payroll" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
