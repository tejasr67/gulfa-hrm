"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Laptop, Car, Smartphone, Package, Shirt, Wrench,
  LogOut, LogIn, Calendar, MapPin, Tag, AlertTriangle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { IssueAssetDialog } from "./IssueAssetDialog";
import { ReturnAssetDialog } from "./ReturnAssetDialog";
import { ScheduleMaintenanceDialog } from "./ScheduleMaintenanceDialog";
import { useDeleteAsset } from "@/modules/assets/hooks";
import type { AssetDetailData } from "@/modules/assets/hooks";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  laptop: Laptop,
  vehicle: Car,
  car: Car,
  phone: Smartphone,
  mobile: Smartphone,
  uniform: Shirt,
  equipment: Wrench,
};

function CategoryIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon ? CATEGORY_ICONS[icon.toLowerCase()] : null) ?? Package;
  return <Icon className={className} />;
}

function fmtAED(n: number | null) {
  if (!n) return "—";
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | Date | null) {
  if (!d) return "—";
  return format(new Date(d), "dd MMM yyyy");
}

type Tab = "overview" | "assignments" | "maintenance";

type Props = { asset: AssetDetailData };

export function AssetDetailClient({ asset }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [showIssue, setShowIssue] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);

  const { trigger: deleteAsset, isMutating: isDeleting } = useDeleteAsset(asset.id);

  const activeAssignment = asset.assignments.find((a) => !a.returnedAt);
  const activeEmployee = activeAssignment?.employee ?? null;

  const warrantyOk = asset.warrantyExpiry && new Date(asset.warrantyExpiry) > new Date();

  const handleRefresh = useCallback(() => router.refresh(), [router]);

  async function handleDelete() {
    if (!confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;
    const res = await deleteAsset();
    if (res?.success) router.push("/assets");
    else alert(res?.error ?? "Failed to delete asset");
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "assignments", label: "Assignments", count: asset.assignments.length },
    { id: "maintenance", label: "Maintenance", count: asset.maintenanceLogs.length },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <CategoryIcon icon={asset.category.icon} className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{asset.name}</h1>
              <StatusBadge status={asset.status} type="asset" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {asset.code}
              {asset.brand ? ` · ${asset.brand}` : ""}
              {asset.model ? ` ${asset.model}` : ""}
              {" · "}{asset.category.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {asset.status === "AVAILABLE" && (
            <Button size="sm" onClick={() => setShowIssue(true)}>
              <LogOut className="h-4 w-4 mr-1" />
              Issue
            </Button>
          )}
          {asset.status === "ASSIGNED" && activeEmployee && activeAssignment && (
            <Button size="sm" variant="outline" onClick={() => setShowReturn(true)}>
              <LogIn className="h-4 w-4 mr-1" />
              Return
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setShowMaintenance(true)}>
            <Wrench className="h-4 w-4 mr-1" />
            Schedule Maintenance
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete} disabled={isDeleting}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1.5 text-xs bg-muted rounded-full px-1.5 py-0.5">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Asset Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Asset Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Serial Number" value={asset.serialNumber ?? "—"} />
              <Row label="Condition" value={asset.condition} />
              <Row label="Location" icon={<MapPin className="h-3.5 w-3.5" />} value={asset.location ?? "—"} />
              {asset.warrantyExpiry && (
                <Row
                  label="Warranty Expiry"
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  value={
                    <span className={warrantyOk ? "text-green-600" : "text-red-600"}>
                      {fmtDate(asset.warrantyExpiry)}
                      {warrantyOk ? " (Active)" : " (Expired)"}
                    </span>
                  }
                />
              )}
              {asset.nextMaintenanceAt && (
                <Row
                  label="Next Maintenance"
                  icon={<Wrench className="h-3.5 w-3.5" />}
                  value={
                    <span className={new Date(asset.nextMaintenanceAt) < new Date() ? "text-red-600" : ""}>
                      {fmtDate(asset.nextMaintenanceAt)}
                    </span>
                  }
                />
              )}
              {asset.replacementCycleMonths && (
                <Row label="Replacement Cycle" value={`${asset.replacementCycleMonths} months`} />
              )}
              {asset.notes && (
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{asset.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Financial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Purchase Price" value={fmtAED(asset.purchasePrice)} />
              <Row label="Current Value" value={fmtAED(asset.currentValue)} />
              {asset.depreciationRate && (
                <Row label="Depreciation Rate" value={`${asset.depreciationRate}% / year`} />
              )}
              {asset.purchaseDate && (
                <Row label="Purchase Date" value={fmtDate(asset.purchaseDate)} icon={<Tag className="h-3.5 w-3.5" />} />
              )}
              {asset.purchasePrice && asset.currentValue && asset.purchasePrice > 0 && (
                <Row
                  label="Value Retained"
                  value={`${Math.round((asset.currentValue / asset.purchasePrice) * 100)}%`}
                />
              )}
            </CardContent>
          </Card>

          {/* Current Assignment */}
          {activeAssignment && activeEmployee && (
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-indigo-600">Currently Assigned</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Employee</p>
                    <p className="font-medium">{activeEmployee.firstName} {activeEmployee.lastName}</p>
                    <p className="text-xs text-muted-foreground">{activeEmployee.employeeId}</p>
                  </div>
                  {activeEmployee.department && (
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-medium">{activeEmployee.department.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Issued On</p>
                    <p className="font-medium">{fmtDate(activeAssignment.assignedAt)}</p>
                  </div>
                  {activeAssignment.expectedReturnDate && (
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Return</p>
                      <p className={`font-medium ${new Date(activeAssignment.expectedReturnDate) < new Date() ? "text-red-600" : ""}`}>
                        {fmtDate(activeAssignment.expectedReturnDate)}
                      </p>
                    </div>
                  )}
                  {activeAssignment.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p>{activeAssignment.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === "assignments" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Assignment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {asset.assignments.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No assignment history.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Employee</th>
                    <th className="text-left px-4 py-3 font-medium">Issued</th>
                    <th className="text-left px-4 py-3 font-medium">Returned</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Condition (Issue → Return)</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {asset.assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        {a.employee ? (
                          <div>
                            <p className="font-medium">{a.employee.firstName} {a.employee.lastName}</p>
                            <p className="text-xs text-muted-foreground">{a.employee.employeeId}</p>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(a.assignedAt)}</td>
                      <td className="px-4 py-3">
                        {a.returnedAt ? (
                          <span className="text-green-600">{fmtDate(a.returnedAt)}</span>
                        ) : (
                          <span className="text-indigo-600 font-medium">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                        {a.condition}
                        {a.returnCondition ? ` → ${a.returnCondition}` : ""}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs max-w-[200px] truncate">
                        {a.returnNotes ?? a.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "maintenance" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Maintenance Log</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowMaintenance(true)}>
              <Wrench className="h-4 w-4 mr-1" />
              Schedule
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {asset.maintenanceLogs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No maintenance records.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Scheduled</th>
                    <th className="text-left px-4 py-3 font-medium">Completed</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Vendor</th>
                    <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Cost</th>
                    <th className="text-center px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {asset.maintenanceLogs.map((m) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium capitalize">{m.type.toLowerCase().replace("_", " ")}</p>
                        {m.description && <p className="text-xs text-muted-foreground truncate max-w-[150px]">{m.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(m.scheduledAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.completedAt ? fmtDate(m.completedAt) : "—"}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{m.vendor ?? "—"}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-right tabular-nums">{fmtAED(m.cost)}</td>
                      <td className="px-4 py-3 text-center">
                        <MaintenanceStatusBadge status={m.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {showIssue && (
        <IssueAssetDialog
          assetId={asset.id}
          assetName={asset.name}
          open
          onClose={() => setShowIssue(false)}
          onSuccess={handleRefresh}
        />
      )}

      {showReturn && activeAssignment && activeEmployee && (
        <ReturnAssetDialog
          assignmentId={activeAssignment.id}
          assetName={asset.name}
          employeeName={`${activeEmployee.firstName} ${activeEmployee.lastName}`}
          open
          onClose={() => setShowReturn(false)}
          onSuccess={handleRefresh}
        />
      )}

      {showMaintenance && (
        <ScheduleMaintenanceDialog
          assetId={asset.id}
          assetName={asset.name}
          open
          onClose={() => setShowMaintenance(false)}
          onSuccess={handleRefresh}
        />
      )}
    </>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-muted-foreground flex items-center gap-1 shrink-0">
        {icon}
        {label}
      </span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
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
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
