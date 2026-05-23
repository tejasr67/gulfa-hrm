"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, ArrowLeftRight, Briefcase, DollarSign, CheckCircle, UserCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddCareerEventDialog } from "@/components/modules/career/AddCareerEventDialog";
import { useCareerStats, useRecentCareerEvents } from "@/modules/career/hooks";
import type { CareerStats } from "@/modules/career/hooks";
import Link from "next/link";

type Props = { initialStats: CareerStats };

const EVENT_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  PROMOTION: { label: "Promotion", icon: TrendingUp, color: "text-emerald-700", bg: "bg-emerald-50" },
  DEMOTION: { label: "Demotion", icon: TrendingDown, color: "text-red-700", bg: "bg-red-50" },
  TRANSFER: { label: "Transfer", icon: ArrowLeftRight, color: "text-blue-700", bg: "bg-blue-50" },
  ROLE_CHANGE: { label: "Role Change", icon: Briefcase, color: "text-purple-700", bg: "bg-purple-50" },
  SALARY_REVISION: { label: "Salary Revision", icon: DollarSign, color: "text-amber-700", bg: "bg-amber-50" },
  PROBATION_COMPLETION: { label: "Probation Completed", icon: CheckCircle, color: "text-teal-700", bg: "bg-teal-50" },
  MANAGER_CHANGE: { label: "Manager Change", icon: UserCheck, color: "text-indigo-700", bg: "bg-indigo-50" },
};

export function CareerClient({ initialStats }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const { data: stats } = useCareerStats();
  const effectiveStats = stats ?? initialStats;
  const { data: events, isLoading, refetch } = useRecentCareerEvents();

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const STAT_CARDS = [
    { label: "Total Events", value: effectiveStats.total, color: "text-foreground" },
    { label: "Last 30 Days", value: effectiveStats.recent, color: "text-blue-600" },
    { label: "Promotions", value: effectiveStats.promotions, color: "text-emerald-600" },
    { label: "Salary Revisions", value: effectiveStats.salaryRevisions, color: "text-amber-600" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="font-semibold">Recent Career Events</h2>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Event
          </Button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No career events</p>
            <p className="text-sm text-muted-foreground mt-1">Career events will appear here once recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Employee</th>
                  <th className="text-left px-4 py-3 font-medium">Event</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Change</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Effective Date</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Reason</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {events.map((e) => {
                  const cfg = EVENT_CONFIG[e.type] ?? { label: e.type, icon: Briefcase, color: "text-gray-700", bg: "bg-gray-50" };
                  const Icon = cfg.icon;
                  let changeSummary = "";
                  if (e.fromPosition && e.toPosition) changeSummary = `${e.fromPosition} → ${e.toPosition}`;
                  else if (e.fromDepartment && e.toDepartment) changeSummary = `${e.fromDepartment} → ${e.toDepartment}`;
                  else if (e.fromSalary != null && e.toSalary != null) {
                    const delta = e.toSalary - e.fromSalary;
                    changeSummary = `AED ${e.toSalary.toLocaleString()} (${delta >= 0 ? "+" : ""}${delta >= 0 || e.fromSalary > 0 ? ((delta / (e.fromSalary || 1)) * 100).toFixed(0) + "%" : ""})`;
                  } else if (e.toPosition) changeSummary = e.toPosition;
                  else if (e.toDepartment) changeSummary = e.toDepartment;

                  return (
                    <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/career/${e.employee.id}`} className="hover:underline">
                          <p className="font-medium">{e.employee.firstName} {e.employee.lastName}</p>
                          <p className="text-xs text-muted-foreground">{e.employee.employeeId}{e.employee.department ? ` · ${e.employee.department.name}` : ""}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${cfg.bg}`}>
                            <Icon className={`h-3 w-3 ${cfg.color}`} />
                          </span>
                          <span className="text-xs font-medium">{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                        {changeSummary || "—"}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                        {format(new Date(e.effectiveDate), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell max-w-[180px]">
                        <p className="truncate text-xs text-muted-foreground">{e.reason ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/career/${e.employee.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddCareerEventDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleRefresh}
      />
    </>
  );
}
