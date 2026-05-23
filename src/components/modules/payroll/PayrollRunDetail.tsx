"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Play, CheckCircle, CreditCard, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PayslipDetailModal } from "./PayslipDetailModal";
import { usePayrollRunAction } from "@/modules/payroll/hooks";

function fmtAED(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(n);
}

type Payslip = {
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
  lineItems: { id: string; name: string; type: string; amount: number }[];
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: { name: string } | null;
    position?: { title: string } | null;
  };
};

type Run = {
  id: string;
  month: number;
  year: number;
  status: string;
  totalAmount: number | null;
  processedAt: Date | string | null;
  approvedAt: Date | string | null;
  notes: string | null;
  payslips: Payslip[];
};

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function PayrollRunDetail({ run }: { run: Run }) {
  const router = useRouter();
  const { trigger, isMutating } = usePayrollRunAction(run.id);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [actionError, setActionError] = useState("");

  async function doAction(action: string) {
    setActionError("");
    const res = await trigger({ action });
    if (!res?.success) {
      setActionError(res?.error ?? "Action failed");
      return;
    }
    router.refresh();
  }

  const totalGross = run.payslips.reduce((s, p) => s + p.grossSalary, 0);
  const totalDeductions = run.payslips.reduce((s, p) => s + p.deductions, 0);
  const totalNet = run.payslips.reduce((s, p) => s + p.netSalary, 0);

  return (
    <>
      {/* Header */}
      <div className="rounded-xl border p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold">
                {MONTH_NAMES[run.month]} {run.year}
              </h1>
              <StatusBadge status={run.status} type="payroll" />
            </div>
            <p className="text-sm text-muted-foreground">
              {run.payslips.length} employees ·{" "}
              {run.processedAt
                ? `Processed ${format(new Date(run.processedAt), "dd MMM yyyy")}`
                : "Not yet generated"}
            </p>
            {run.notes && <p className="text-sm text-muted-foreground mt-1">{run.notes}</p>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {run.status === "DRAFT" && (
              <Button onClick={() => doAction("generate")} disabled={isMutating}>
                <Play className="h-4 w-4 mr-1" />
                {isMutating ? "Generating…" : "Generate Payslips"}
              </Button>
            )}
            {run.status === "DRAFT" && run.payslips.length > 0 && (
              <Button variant="outline" onClick={() => doAction("approve")} disabled={isMutating}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            )}
            {run.status === "APPROVED" && (
              <Button onClick={() => doAction("pay")} disabled={isMutating}>
                <CreditCard className="h-4 w-4 mr-1" />
                Mark as Paid
              </Button>
            )}
            {run.status !== "PAID" && run.status !== "CANCELLED" && (
              <Button variant="outline" className="text-destructive" onClick={() => doAction("cancel")} disabled={isMutating}>
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {actionError && <p className="text-sm text-destructive">{actionError}</p>}

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          {[
            { label: "Gross Payroll", value: fmtAED(totalGross) },
            { label: "Total Deductions", value: fmtAED(totalDeductions) },
            { label: "Net Payroll", value: fmtAED(totalNet), highlight: true },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className={`text-lg font-bold ${item.highlight ? "text-green-600" : ""}`}>
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payslips table */}
      <div className="rounded-xl border">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Payslips</h2>
        </div>

        {run.payslips.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No payslips yet — click "Generate Payslips" above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Employee</th>
                  <th className="text-right px-4 py-3 font-medium">Basic</th>
                  <th className="text-right px-4 py-3 font-medium">Allowances</th>
                  <th className="text-right px-4 py-3 font-medium">OT</th>
                  <th className="text-right px-4 py-3 font-medium">Deductions</th>
                  <th className="text-right px-4 py-3 font-medium">Net</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {run.payslips.map((ps) => {
                  const allowances =
                    ps.housingAllowance +
                    ps.transportAllowance +
                    ps.foodAllowance +
                    ps.mobileAllowance +
                    ps.otherAllowances;
                  return (
                    <tr key={ps.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {ps.employee.firstName} {ps.employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ps.employee.employeeId} · {ps.employee.department?.name ?? ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtAED(ps.basicSalary)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtAED(allowances)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtAED(ps.overtime)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-destructive">
                        -{fmtAED(ps.deductions)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-green-600">
                        {fmtAED(ps.netSalary)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={ps.status} type="payroll" />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedPayslip(ps)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PayslipDetailModal
        payslip={selectedPayslip}
        open={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
      />
    </>
  );
}
