"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AssignBenefitDialog } from "@/components/modules/benefits/AssignBenefitDialog";
import {
  useEmployeeBenefits,
  useBenefitTypes,
  useBenefitStats,
  useTerminateBenefit,
} from "@/modules/benefits/hooks";
import type { BenefitStats, EmployeeBenefitItem } from "@/modules/benefits/hooks";

type Props = { initialStats: BenefitStats };

function fmtAED(n: number | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(n);
}

export function BenefitsClient({ initialStats }: Props) {
  const [showAssign, setShowAssign] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);

  const { data: stats } = useBenefitStats();
  const effectiveStats = stats ?? initialStats;
  const { data: benefits, isLoading, refetch } = useEmployeeBenefits({
    typeId: typeFilter || undefined,
    isActive: activeOnly ? true : undefined,
  });
  const { data: types } = useBenefitTypes();

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const STAT_CARDS = [
    { label: "Benefit Types", value: effectiveStats.types, color: "text-purple-600" },
    { label: "Active Benefits", value: effectiveStats.activeCount, color: "text-green-600" },
    { label: "Total Monthly Value", value: fmtAED(effectiveStats.totalValue), color: "text-blue-600" },
  ];

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {STAT_CARDS.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border">
        <div className="border-b px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[160px]"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({t._count.employeeBenefits})</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded"
              />
              Active only
            </label>
            <div className="flex-1" />
            <Button onClick={() => setShowAssign(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Assign Benefit
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : benefits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Heart className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No benefits configured</p>
            <p className="text-sm text-muted-foreground mt-1">Assign benefits to employees to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Employee</th>
                  <th className="text-left px-4 py-3 font-medium">Benefit Type</th>
                  <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Value (AED)</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Start Date</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">End Date</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {benefits.map((b) => (
                  <BenefitRow key={b.id} benefit={b} onRefresh={handleRefresh} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AssignBenefitDialog
        open={showAssign}
        onClose={() => setShowAssign(false)}
        onSuccess={handleRefresh}
        types={types}
      />
    </>
  );
}

function BenefitRow({ benefit, onRefresh }: { benefit: EmployeeBenefitItem; onRefresh: () => void }) {
  const { trigger, isMutating } = useTerminateBenefit(benefit.id);

  async function handleTerminate() {
    if (!confirm(`Terminate ${benefit.benefitType.name} for ${benefit.employee.firstName} ${benefit.employee.lastName}?`)) return;
    const res = await trigger();
    if (res?.success) onRefresh();
    else alert(res?.error ?? "Failed");
  }

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium">{benefit.employee.firstName} {benefit.employee.lastName}</p>
        <p className="text-xs text-muted-foreground">{benefit.employee.employeeId}{benefit.employee.department ? ` · ${benefit.employee.department.name}` : ""}</p>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-full bg-purple-50 text-purple-700 px-2 py-0.5 text-xs font-medium">
          {benefit.benefitType.name}
        </span>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-right tabular-nums">
        {benefit.value ? new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(benefit.value) : "—"}
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
        {format(new Date(benefit.startDate), "dd MMM yyyy")}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
        {benefit.endDate ? format(new Date(benefit.endDate), "dd MMM yyyy") : "Ongoing"}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${benefit.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>
          {benefit.isActive ? "Active" : "Ended"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {benefit.isActive && (
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleTerminate} disabled={isMutating}>
            End
          </Button>
        )}
      </td>
    </tr>
  );
}
