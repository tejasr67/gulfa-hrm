"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtAED(n: number | null) {
  if (n === null) return "—";
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(n);
}

type Run = {
  id: string;
  month: number;
  year: number;
  status: string;
  totalAmount: number | null;
  processedAt: Date | string | null;
  _count: { payslips: number };
};

export function PayrollRunsTable({ runs }: { runs: Run[] }) {
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium">No payroll runs yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first payroll run to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {runs.map((run) => (
        <div
          key={run.id}
          className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
              {run.month.toString().padStart(2, "0")}
            </div>
            <div>
              <p className="font-medium">
                {MONTH_NAMES[run.month]} {run.year}
              </p>
              <p className="text-sm text-muted-foreground">
                {run._count.payslips} payslips
                {run.processedAt
                  ? ` · Processed ${format(new Date(run.processedAt), "dd MMM yyyy")}`
                  : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="font-semibold">{fmtAED(run.totalAmount)}</p>
              <p className="text-xs text-muted-foreground">Net Payroll</p>
            </div>
            <StatusBadge status={run.status} type="payroll" />
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/payroll/runs/${run.id}`}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
