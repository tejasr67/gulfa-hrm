"use client";

import { Badge } from "@/components/ui/badge";
import type { AttendanceStatus } from "@/modules/attendance/types";

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; className: string }> = {
  PRESENT: { label: "Present", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  ABSENT: { label: "Absent", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  LATE: { label: "Late", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  HALF_DAY: { label: "Half Day", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  ON_LEAVE: { label: "On Leave", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  REMOTE: { label: "Remote", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  HOLIDAY: { label: "Holiday", className: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" },
  WEEKEND: { label: "Weekend", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: "" };
  return (
    <Badge className={`text-xs font-medium border-0 ${config.className}`} variant="outline">
      {config.label}
    </Badge>
  );
}
