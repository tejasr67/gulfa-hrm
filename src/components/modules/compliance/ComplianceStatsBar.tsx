"use client";

import { AlertTriangle, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ComplianceStat } from "@/modules/compliance/types";

type Props = { stats: ComplianceStat };

type StatCard = {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
};

export function ComplianceStatsBar({ stats }: Props) {
  const cards: StatCard[] = [
    {
      label: "Expired",
      value: stats.expired,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
    },
    {
      label: "Critical (≤30 days)",
      value: stats.critical,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50 border-orange-200",
    },
    {
      label: "Warning (31–90 days)",
      value: stats.warning,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50 border-yellow-200",
    },
    {
      label: "Compliant",
      value: stats.ok,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={cn("rounded-xl border p-5", bg)}>
          <div className={cn("flex items-center gap-2", color)}>
            <Icon className="h-5 w-5" />
            <span className="text-2xl font-bold">{value}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          {stats.total > 0 && (
            <p className={cn("mt-0.5 text-xs font-medium", color)}>
              {Math.round((value / stats.total) * 100)}% of {stats.total}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
