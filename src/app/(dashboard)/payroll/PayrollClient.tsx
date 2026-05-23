"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PayrollStatsBar } from "@/components/modules/payroll/PayrollStatsBar";
import { PayrollRunsTable } from "@/components/modules/payroll/PayrollRunsTable";
import { CreatePayrollRunDialog } from "@/components/modules/payroll/CreatePayrollRunDialog";
import { usePayrollRuns, usePayrollReports, type PayrollRunListItem } from "@/modules/payroll/hooks";
import type { PayrollStats } from "@/modules/payroll/types";

type Props = { initialStats: PayrollStats };

export function PayrollClient({ initialStats }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const { data: runs = [] as PayrollRunListItem[], isLoading } = usePayrollRuns();
  const { data: reports } = usePayrollReports();

  const stats: PayrollStats = reports?.stats ?? initialStats;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Process monthly payroll, view payslips, and manage salary structures
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Payroll Run
        </Button>
      </div>

      <PayrollStatsBar stats={stats} />

      <div className="rounded-xl border mt-6">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Payroll Runs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monthly payroll processing history
          </p>
        </div>
        <div>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <PayrollRunsTable runs={runs} />
          )}
        </div>
      </div>

      <CreatePayrollRunDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}
