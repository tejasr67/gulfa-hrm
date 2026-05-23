"use client";

import { Calendar, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils/formatters";
import { useEmployeeLeave } from "@/modules/employees/hooks";

export function LeaveTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error } = useEmployeeLeave(employeeId);

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              {["Leave Type", "Period", "Days", "Status", "Reason"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b">
                {Array.from({ length: 5 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-muted rounded animate-pulse w-20" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No leave history"
        description="Leave requests for this employee will appear here."
      />
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Leave Type</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Period</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Days</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reason</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.id} className="border-b hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <p className="font-medium">{entry.leaveType.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{entry.leaveType.code}</p>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <p>{formatDate(entry.startDate)}</p>
                {entry.startDate !== entry.endDate && (
                  <p className="text-xs text-muted-foreground">to {formatDate(entry.endDate)}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="font-mono">{entry.isHalfDay ? "0.5" : entry.totalDays}</span>
                {entry.isHalfDay && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">Half Day</Badge>
                )}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={entry.status} type="leave" />
              </td>
              <td className="px-4 py-3 max-w-[200px]">
                <p className="text-sm text-muted-foreground truncate">{entry.reason ?? "—"}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
