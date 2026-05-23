"use client";

import { Clock, UserCheck, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { LeaveStats } from "@/modules/leave/types";

type Props = { stats: LeaveStats };

export function LeaveStatsBar({ stats }: Props) {
  const cards = [
    {
      label: "Pending Approvals",
      value: stats.pendingApprovals,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
    },
    {
      label: "On Leave Today",
      value: stats.onLeaveToday,
      icon: UserCheck,
      color: "text-blue-600",
      bg: "bg-blue-50 border-blue-200",
    },
    {
      label: "Approved This Month",
      value: stats.approvedThisMonth,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50 border-emerald-200",
    },
    {
      label: "Rejected This Month",
      value: stats.rejectedThisMonth,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={cn("rounded-xl border p-4", bg)}>
          <div className="flex items-center gap-2">
            <Icon className={cn("h-4 w-4", color)} />
            <span className={cn("text-xs font-medium", color)}>{label}</span>
          </div>
          <p className={cn("mt-2 text-2xl font-bold", color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}
