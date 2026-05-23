"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Laptop, Car, Smartphone, Package, Shirt, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAssetReports } from "@/modules/assets/hooks";
import type { AssetCategoryBreakdown } from "@/modules/assets/types";

const PIE_COLORS = ["#6366f1", "#22c55e", "#f97316", "#06b6d4", "#ec4899", "#84cc16", "#f43f5e"];

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

function fmtAED(n: number) {
  if (n === 0) return "—";
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(n);
}

export function AssetReportsClient() {
  const { data, isLoading } = useAssetReports();

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading reports…</div>;
  }

  if (!data) {
    return <div className="py-16 text-center text-sm text-muted-foreground">No data available.</div>;
  }

  const { stats, categoryBreakdown } = data;

  const statusPieData = [
    { name: "Available", value: stats.available },
    { name: "Assigned", value: stats.assigned },
    { name: "Maintenance", value: stats.underMaintenance },
    { name: "Disposed", value: stats.disposed },
    { name: "Lost", value: stats.lost },
  ].filter((d) => d.value > 0);

  const categoryBarData = categoryBreakdown.slice(0, 10).map((c) => ({
    name: c.categoryName.length > 12 ? c.categoryName.slice(0, 12) + "…" : c.categoryName,
    available: c.available,
    assigned: c.assigned,
    maintenance: c.underMaintenance,
  }));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Assets", value: stats.total },
          { label: "Utilization Rate", value: stats.total > 0 ? `${Math.round((stats.assigned / stats.total) * 100)}%` : "—" },
          { label: "Total Value", value: fmtAED(stats.totalValue) },
          { label: "Book Value", value: fmtAED(stats.currentValue) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status distribution pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Asset Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusPieData.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No assets yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [v, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBarData.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">No categories yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryBarData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="available" fill="#22c55e" name="Available" radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="assigned" fill="#6366f1" name="Assigned" radius={[0, 0, 0, 0]} stackId="a" />
                  <Bar dataKey="maintenance" fill="#f97316" name="Maintenance" radius={[0, 0, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {categoryBreakdown.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No assets yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Category</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-right px-4 py-3 font-medium">Available</th>
                    <th className="text-right px-4 py-3 font-medium">Assigned</th>
                    <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Maintenance</th>
                    <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Utilization</th>
                    <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categoryBreakdown.map((c) => (
                    <CategoryRow key={c.categoryId} cat={c} />
                  ))}
                </tbody>
                <tfoot className="border-t bg-muted/20">
                  <tr>
                    <td className="px-4 py-3 font-medium">Total</td>
                    <td className="px-4 py-3 text-right font-medium">{stats.total}</td>
                    <td className="px-4 py-3 text-right text-green-600">{stats.available}</td>
                    <td className="px-4 py-3 text-right text-indigo-600">{stats.assigned}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-right text-orange-600">{stats.underMaintenance}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-right">
                      {stats.total > 0 ? `${Math.round((stats.assigned / stats.total) * 100)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right tabular-nums">{fmtAED(stats.totalValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryRow({ cat }: { cat: AssetCategoryBreakdown }) {
  const util = cat.total > 0 ? Math.round((cat.assigned / cat.total) * 100) : 0;
  return (
    <tr className="hover:bg-muted/20">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
            <CategoryIcon icon={cat.icon} className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="font-medium">{cat.categoryName}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right tabular-nums">{cat.total}</td>
      <td className="px-4 py-3 text-right tabular-nums text-green-600">{cat.available}</td>
      <td className="px-4 py-3 text-right tabular-nums text-indigo-600">{cat.assigned}</td>
      <td className="px-4 py-3 hidden sm:table-cell text-right tabular-nums text-orange-600">{cat.underMaintenance}</td>
      <td className="px-4 py-3 hidden md:table-cell text-right">
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${util}%` }} />
          </div>
          <span className="tabular-nums text-xs w-8 text-right">{util}%</span>
        </div>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-right tabular-nums">{fmtAED(cat.totalValue)}</td>
    </tr>
  );
}
