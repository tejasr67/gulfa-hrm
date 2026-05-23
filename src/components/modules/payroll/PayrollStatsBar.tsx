"use client";

import { DollarSign, Users, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PayrollStats } from "@/modules/payroll/types";

function fmtAED(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(n);
}

export function PayrollStatsBar({ stats }: { stats: PayrollStats }) {
  const items = [
    {
      label: "Monthly Payroll Cost",
      value: fmtAED(stats.totalPayrollCost),
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Employees on Payroll",
      value: stats.totalEmployees.toString(),
      icon: Users,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Avg. Monthly Salary",
      value: fmtAED(stats.avgSalary),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Pending Runs",
      value: stats.pendingRuns.toString(),
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${item.bg}`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
