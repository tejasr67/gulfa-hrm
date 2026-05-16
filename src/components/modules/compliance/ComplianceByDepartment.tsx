"use client";

import { cn } from "@/lib/utils/cn";
import type { ComplianceByDepartment } from "@/modules/compliance/types";

type Props = { data: ComplianceByDepartment[] };

export function ComplianceByDepartmentChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">No data</div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((row) => (
        <div key={row.department} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate max-w-[200px]">{row.department}</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{row.atRisk} at risk</span>
              <span className={cn(
                "font-semibold",
                row.complianceRate >= 90 ? "text-green-600" :
                row.complianceRate >= 70 ? "text-yellow-600" : "text-red-600"
              )}>
                {row.complianceRate}%
              </span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                row.complianceRate >= 90 ? "bg-green-500" :
                row.complianceRate >= 70 ? "bg-yellow-500" : "bg-red-500"
              )}
              style={{ width: `${row.complianceRate}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
