"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Laptop, Car, Smartphone, Package, Shirt, Wrench, ChevronRight, LogOut, LogIn } from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { IssueAssetDialog } from "./IssueAssetDialog";
import { ReturnAssetDialog } from "./ReturnAssetDialog";
import type { AssetListEntry } from "@/modules/assets/hooks";

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

type Props = { assets: AssetListEntry[]; onRefresh: () => void };

type IssueTarget = { assetId: string; assetName: string };
type ReturnTarget = { assignmentId: string; assetName: string; employeeName: string };

export function AssetGrid({ assets, onRefresh }: Props) {
  const [issueTarget, setIssueTarget] = useState<IssueTarget | null>(null);
  const [returnTarget, setReturnTarget] = useState<ReturnTarget | null>(null);

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium">No assets found</p>
        <p className="text-sm text-muted-foreground mt-1">Add your first asset or adjust filters.</p>
      </div>
    );
  }

  const activeAssignment = (a: AssetListEntry) =>
    a.assignments.find((x) => x.employee != null)?.employee ?? null;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Asset</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Category</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Assigned To</th>
              <th className="text-right px-4 py-3 font-medium hidden xl:table-cell">Value</th>
              <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Warranty</th>
              <th className="text-center px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {assets.map((asset) => {
              const emp = activeAssignment(asset);
              const warrantyOk = asset.warrantyExpiry && new Date(asset.warrantyExpiry) > new Date();

              return (
                <tr key={asset.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <CategoryIcon icon={asset.category.icon} className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {asset.code}
                          {asset.brand ? ` · ${asset.brand}` : ""}
                          {asset.model ? ` ${asset.model}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{asset.category.name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {emp ? (
                      <div>
                        <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-right tabular-nums">
                    <p>{fmtAED(asset.currentValue)}</p>
                    {asset.purchasePrice && asset.currentValue && asset.purchasePrice !== asset.currentValue && (
                      <p className="text-xs text-muted-foreground">Orig: {fmtAED(asset.purchasePrice)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {asset.warrantyExpiry ? (
                      <span className={warrantyOk ? "text-green-600 text-xs" : "text-red-600 text-xs"}>
                        {format(new Date(asset.warrantyExpiry), "dd MMM yyyy")}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={asset.status} type="asset" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {asset.status === "AVAILABLE" && (
                        <Button variant="ghost" size="sm" onClick={() => setIssueTarget({ assetId: asset.id, assetName: asset.name })}>
                          <LogOut className="h-3.5 w-3.5 mr-1" />
                          Issue
                        </Button>
                      )}
                      {asset.status === "ASSIGNED" && emp && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          const assignmentId = asset.assignments[0]?.id;
                          if (assignmentId) setReturnTarget({ assignmentId, assetName: asset.name, employeeName: `${emp.firstName} ${emp.lastName}` });
                        }}>
                          <LogIn className="h-3.5 w-3.5 mr-1" />
                          Return
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/assets/${asset.id}`}><ChevronRight className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {issueTarget && (
        <IssueAssetDialog
          assetId={issueTarget.assetId}
          assetName={issueTarget.assetName}
          open
          onClose={() => setIssueTarget(null)}
          onSuccess={onRefresh}
        />
      )}

      {returnTarget && (
        <ReturnAssetDialog
          assignmentId={returnTarget.assignmentId}
          assetName={returnTarget.assetName}
          employeeName={returnTarget.employeeName}
          open
          onClose={() => setReturnTarget(null)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
