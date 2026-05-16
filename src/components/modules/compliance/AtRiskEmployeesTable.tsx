"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertCircle, AlertTriangle, Clock, CheckCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useExpiringDocuments } from "@/modules/compliance/hooks";
import type { ExpiryRisk, DocumentExpiryItem } from "@/modules/compliance/types";

const RISK_CONFIG: Record<ExpiryRisk, { label: string; variant: "destructive" | "default" | "secondary" | "outline"; icon: React.ElementType }> = {
  expired: { label: "Expired", variant: "destructive", icon: AlertCircle },
  critical: { label: "Critical", variant: "default", icon: AlertTriangle },
  warning: { label: "Warning", variant: "secondary", icon: Clock },
  ok: { label: "OK", variant: "outline", icon: CheckCircle },
};

type Props = { initialRisk?: ExpiryRisk };

export function AtRiskEmployeesTable({ initialRisk }: Props) {
  const [risk, setRisk] = useState<ExpiryRisk | undefined>(initialRisk);
  const { items, total, isLoading } = useExpiringDocuments({ risk });

  const filterButtons: { label: string; value: ExpiryRisk | undefined }[] = [
    { label: "All", value: undefined },
    { label: "Expired", value: "expired" },
    { label: "Critical", value: "critical" },
    { label: "Warning", value: "warning" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {filterButtons.map(({ label, value }) => (
          <Button
            key={label}
            size="sm"
            variant={risk === value ? "default" : "outline"}
            onClick={() => setRisk(value)}
          >
            {label}
          </Button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">{total} document(s)</span>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No documents match this filter
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Employee", "Document", "Expiry Date", "Days", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item: DocumentExpiryItem) => {
                const cfg = RISK_CONFIG[item.risk];
                const Icon = cfg.icon;
                return (
                  <tr key={item.documentId} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{item.employeeCode} · {item.department ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{item.documentTypeName}</div>
                      {item.documentNumber && (
                        <div className="text-xs text-muted-foreground font-mono">{item.documentNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {format(parseISO(item.expiryDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {item.daysUntilExpiry < 0
                        ? <span className="text-red-600">{Math.abs(item.daysUntilExpiry)}d ago</span>
                        : <span>{item.daysUntilExpiry}d</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={cfg.variant} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/employees/${item.employeeId}`}>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
