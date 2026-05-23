"use client";

import { Package, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate } from "@/lib/utils/formatters";
import { useEmployeeAssets } from "@/modules/employees/hooks";

export function AssetsTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading, error } = useEmployeeAssets(employeeId);

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
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border p-4 animate-pulse">
            <div className="h-10 w-10 bg-muted rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-40" />
              <div className="h-3 bg-muted rounded w-24" />
            </div>
            <div className="h-6 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No assets assigned"
        description="Assets issued to this employee will appear here."
      />
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Asset</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code / Serial</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issued</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expected Return</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Condition</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Returned</th>
          </tr>
        </thead>
        <tbody>
          {data.map((assignment) => (
            <tr key={assignment.id} className="border-b hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {assignment.asset.category.icon && (
                    <span className="text-lg leading-none">{assignment.asset.category.icon}</span>
                  )}
                  <div>
                    <p className="font-medium">{assignment.asset.name}</p>
                    <p className="text-xs text-muted-foreground">{assignment.asset.category.name}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <p className="font-mono text-xs">{assignment.asset.code}</p>
                {assignment.asset.serialNumber && (
                  <p className="font-mono text-xs text-muted-foreground">{assignment.asset.serialNumber}</p>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {formatDate(assignment.assignedAt)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                {assignment.expectedReturnDate ? formatDate(assignment.expectedReturnDate) : "—"}
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className="capitalize">
                  {assignment.condition.toLowerCase().replace(/_/g, " ")}
                </Badge>
              </td>
              <td className="px-4 py-3">
                {assignment.returnedAt ? (
                  <div>
                    <Badge variant="success" className="mb-1">Returned</Badge>
                    <p className="text-xs text-muted-foreground">{formatDate(assignment.returnedAt)}</p>
                  </div>
                ) : (
                  <Badge variant="info">Active</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
