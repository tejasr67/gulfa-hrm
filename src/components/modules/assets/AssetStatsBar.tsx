"use client";

import { Package, CheckCircle, Users, Wrench, AlertTriangle, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { AssetStats } from "@/modules/assets/types";

function fmtAED(n: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(n);
}

export function AssetStatsBar({ stats }: { stats: AssetStats }) {
  const items = [
    { label: "Total Assets", value: stats.total.toString(), icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Available", value: stats.available.toString(), icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Assigned", value: stats.assigned.toString(), icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "In Maintenance", value: stats.underMaintenance.toString(), icon: Wrench, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Lost / Disposed", value: (stats.lost + stats.disposed).toString(), icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Book Value", value: fmtAED(stats.currentValue), icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${item.bg} shrink-0`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                <p className="text-lg font-semibold truncate">{item.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
