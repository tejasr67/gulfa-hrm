"use client";

import { ShieldAlert, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils/formatters";
import { useEmployeeDisciplinary } from "@/modules/employees/hooks";
import type { BadgeProps } from "@/components/ui/badge";

const SEVERITY_VARIANTS: Record<string, BadgeProps["variant"]> = {
  CRITICAL: "danger",
  MAJOR: "warning",
  MODERATE: "info",
  MINOR: "secondary",
};

const STATUS_VARIANTS: Record<string, BadgeProps["variant"]> = {
  OPEN: "warning",
  CLOSED: "secondary",
  APPEALED: "info",
};

export function DisciplinaryTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error } = useEmployeeDisciplinary(employeeId);

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
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2 animate-pulse">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-64 bg-muted rounded" />
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No disciplinary records"
        description="Disciplinary actions recorded for this employee will appear here."
      />
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Incident Date</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Severity</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action Taken</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody>
          {data.map((record) => (
            <tr key={record.id} className="border-b hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap font-medium">
                {formatDate(record.incidentDate)}
              </td>
              <td className="px-4 py-3">
                <p className="font-medium">{record.disciplinaryType.name}</p>
              </td>
              <td className="px-4 py-3">
                <Badge variant={SEVERITY_VARIANTS[record.disciplinaryType.severity] ?? "secondary"}>
                  {record.disciplinaryType.severity}
                </Badge>
              </td>
              <td className="px-4 py-3 max-w-[200px]">
                <p className="text-sm text-muted-foreground line-clamp-2">{record.description}</p>
              </td>
              <td className="px-4 py-3 max-w-[160px]">
                <p className="text-sm text-muted-foreground truncate">{record.action ?? "—"}</p>
              </td>
              <td className="px-4 py-3">
                <Badge variant={STATUS_VARIANTS[record.status] ?? "secondary"}>
                  {record.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
