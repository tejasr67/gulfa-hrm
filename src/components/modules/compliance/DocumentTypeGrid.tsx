"use client";

import { cn } from "@/lib/utils/cn";
import type { ComplianceByDocType } from "@/modules/compliance/types";

type Props = { data: ComplianceByDocType[] };

export function DocumentTypeGrid({ data }: Props) {
  if (data.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">No document data</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {data.map((row) => {
        const complianceRate = row.total > 0 ? Math.round((row.ok / row.total) * 100) : 100;
        return (
          <div key={row.documentType} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm">{row.documentType}</h4>
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                complianceRate >= 90 ? "bg-green-100 text-green-700" :
                complianceRate >= 70 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              )}>
                {complianceRate}% OK
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-xs">
              <div className="rounded bg-red-50 p-1.5">
                <div className="font-bold text-red-600">{row.expired}</div>
                <div className="text-muted-foreground">Expired</div>
              </div>
              <div className="rounded bg-orange-50 p-1.5">
                <div className="font-bold text-orange-600">{row.critical}</div>
                <div className="text-muted-foreground">Critical</div>
              </div>
              <div className="rounded bg-yellow-50 p-1.5">
                <div className="font-bold text-yellow-600">{row.warning}</div>
                <div className="text-muted-foreground">Warning</div>
              </div>
              <div className="rounded bg-green-50 p-1.5">
                <div className="font-bold text-green-600">{row.ok}</div>
                <div className="text-muted-foreground">OK</div>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full flex">
                {row.expired > 0 && (
                  <div className="bg-red-500" style={{ width: `${(row.expired / row.total) * 100}%` }} />
                )}
                {row.critical > 0 && (
                  <div className="bg-orange-500" style={{ width: `${(row.critical / row.total) * 100}%` }} />
                )}
                {row.warning > 0 && (
                  <div className="bg-yellow-500" style={{ width: `${(row.warning / row.total) * 100}%` }} />
                )}
                {row.ok > 0 && (
                  <div className="bg-green-500" style={{ width: `${(row.ok / row.total) * 100}%` }} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
