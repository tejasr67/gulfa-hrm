"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";

function fmtAED(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(n);
}

type LineItem = { id: string; name: string; type: string; amount: number };
type Employee = { firstName: string; lastName: string; employeeId: string; department?: { name: string } | null; position?: { title: string } | null };

type PayslipData = {
  id: string;
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
  netSalary: number;
  workingDays: number;
  paidDays: number;
  leaveDays: number;
  absentDays: number;
  overtimeHours: number;
  status: string;
  lineItems: LineItem[];
  employee: Employee;
};

type Props = { payslip: PayslipData | null; open: boolean; onClose: () => void };

export function PayslipDetailModal({ payslip, open, onClose }: Props) {
  if (!payslip) return null;

  const earnings = payslip.lineItems.filter((li) => li.amount > 0);
  const deductionItems = payslip.lineItems.filter((li) => li.amount < 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payslip — {payslip.employee.firstName} {payslip.employee.lastName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{payslip.employee.employeeId} · {payslip.employee.position?.title ?? ""}</p>
          <p>{payslip.employee.department?.name ?? ""}</p>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={payslip.status} type="payroll" />
        </div>

        <Separator />

        {/* Attendance summary */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Working Days", value: payslip.workingDays },
            { label: "Paid Days", value: payslip.paidDays },
            { label: "Leave Days", value: payslip.leaveDays },
            { label: "Absent Days", value: payslip.absentDays },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border p-2">
              <p className="text-lg font-semibold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Earnings */}
        <div>
          <p className="text-sm font-medium mb-2">Earnings</p>
          <div className="space-y-1">
            {earnings.map((li) => (
              <div key={li.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{li.name}</span>
                <span className="font-medium">{fmtAED(li.amount)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t">
            <span>Gross Salary</span>
            <span>{fmtAED(payslip.grossSalary)}</span>
          </div>
        </div>

        {/* Deductions */}
        {deductionItems.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Deductions</p>
            <div className="space-y-1">
              {deductionItems.map((li) => (
                <div key={li.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{li.name}</span>
                  <span className="font-medium text-destructive">{fmtAED(li.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm font-semibold mt-2 pt-2 border-t text-destructive">
              <span>Total Deductions</span>
              <span>-{fmtAED(payslip.deductions)}</span>
            </div>
          </div>
        )}

        <Separator />

        <div className="flex justify-between text-base font-bold">
          <span>Net Salary</span>
          <span className="text-green-600">{fmtAED(payslip.netSalary)}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
