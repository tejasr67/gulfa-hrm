"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Wrench, AlertTriangle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompleteMaintenanceDialog } from "./CompleteMaintenanceDialog";
import { useMaintenanceLogs, useMaintenanceAlerts } from "@/modules/assets/hooks";
import type { MaintenanceLogEntry } from "@/modules/assets/hooks";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function fmtAED(n: number | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy");
}

function MaintenanceStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    SCHEDULED: "bg-blue-50 text-blue-700",
    IN_PROGRESS: "bg-orange-50 text-orange-700",
    COMPLETED: "bg-green-50 text-green-700",
    CANCELLED: "bg-gray-100 text-gray-600",
    OVERDUE: "bg-red-50 text-red-700",
  };
  const cls = map[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.charAt(0) + status.slice(1).toLowerCase().replace("_", " ")}
    </span>
  );
}

type CompleteTarget = { maintenanceId: string; assetName: string };

export function MaintenanceClient() {
  const [statusFilter, setStatusFilter] = useState("");
  const [completeTarget, setCompleteTarget] = useState<CompleteTarget | null>(null);

  const { data: logs, isLoading, refetch } = useMaintenanceLogs(
    statusFilter ? { status: statusFilter } : undefined
  );
  const { data: alerts } = useMaintenanceAlerts();

  const pendingAlerts = alerts.filter((a) => a.isOverdue || a.daysUntil <= 7);

  function handleRefresh() {
    refetch();
  }

  return (
    <>
      {/* Alerts banner */}
      {pendingAlerts.length > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">
                {pendingAlerts.filter((a) => a.isOverdue).length} overdue,{" "}
                {pendingAlerts.filter((a) => !a.isOverdue).length} due within 7 days
              </p>
              <div className="mt-1 space-y-0.5">
                {pendingAlerts.slice(0, 5).map((a) => (
                  <p key={a.assetId} className="text-xs text-orange-700">
                    <Link href={`/assets/${a.assetId}`} className="font-medium hover:underline">{a.assetName}</Link>
                    {" "}({a.categoryName}) —{" "}
                    {a.isOverdue ? `${Math.abs(a.daysUntil)} days overdue` : `due in ${a.daysUntil} days`}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Scheduled", value: logs.filter((l) => l.status === "SCHEDULED").length, color: "text-blue-600" },
          { label: "In Progress", value: logs.filter((l) => l.status === "IN_PROGRESS").length, color: "text-orange-600" },
          { label: "Overdue", value: alerts.filter((a) => a.isOverdue).length, color: "text-red-600" },
          { label: "Completed", value: logs.filter((l) => l.status === "COMPLETED").length, color: "text-green-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <div className="border-b px-6 py-4 flex items-center justify-between gap-4">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground">{logs.length} records</p>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground mb-3 mx-auto" />
            <p className="font-medium">No maintenance records</p>
            <p className="text-sm text-muted-foreground mt-1">Schedule maintenance from an asset's detail page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Asset</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Scheduled</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Vendor</th>
                  <th className="text-right px-4 py-3 font-medium hidden xl:table-cell">Cost</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <MaintenanceRow
                    key={log.id}
                    log={log}
                    onComplete={() => setCompleteTarget({ maintenanceId: log.id, assetName: log.asset.name })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {completeTarget && (
        <CompleteMaintenanceDialog
          maintenanceId={completeTarget.maintenanceId}
          assetName={completeTarget.assetName}
          open
          onClose={() => setCompleteTarget(null)}
          onSuccess={() => { setCompleteTarget(null); handleRefresh(); }}
        />
      )}
    </>
  );
}

function MaintenanceRow({
  log,
  onComplete,
}: {
  log: MaintenanceLogEntry;
  onComplete: () => void;
}) {
  const canComplete = log.status === "SCHEDULED" || log.status === "IN_PROGRESS" || log.status === "OVERDUE";

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium">{log.asset.name}</p>
          <p className="text-xs text-muted-foreground">{log.asset.code} · {log.asset.category.name}</p>
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground capitalize">
        {log.type.toLowerCase().replace("_", " ")}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        <p>{format(new Date(log.scheduledAt), "dd MMM yyyy")}</p>
        {log.description && <p className="text-xs truncate max-w-[140px]">{log.description}</p>}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{log.vendor ?? "—"}</td>
      <td className="px-4 py-3 hidden xl:table-cell text-right tabular-nums">
        {fmtAED(log.cost)}
      </td>
      <td className="px-4 py-3 text-center">
        <MaintenanceStatusBadge status={log.status} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {canComplete && (
            <Button variant="ghost" size="sm" onClick={onComplete}>
              Complete
            </Button>
          )}
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/assets/${log.asset.id}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}
