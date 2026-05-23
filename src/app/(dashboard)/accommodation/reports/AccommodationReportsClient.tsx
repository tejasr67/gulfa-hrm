"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOccupancyReport } from "@/modules/accommodation/hooks";
import type { OccupancyPropertyReport, AccommodationStats } from "@/modules/accommodation/hooks";

type Props = {
  initialReport: OccupancyPropertyReport[];
  initialStats: AccommodationStats;
};

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartment",
  VILLA: "Villa",
  LABOR_CAMP: "Labour Camp",
  HOTEL: "Hotel",
};

const PIE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function UtilBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-indigo-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{pct}%</span>
    </div>
  );
}

export function AccommodationReportsClient({ initialReport, initialStats }: Props) {
  const { data: liveReport } = useOccupancyReport();
  const report = liveReport.length > 0 ? liveReport : initialReport;
  const stats = initialStats;

  // Pie chart: occupied vs available
  const pieData = [
    { name: "Occupied", value: stats.occupied },
    { name: "Available", value: stats.available },
  ];

  // Bar chart: per-property occupancy
  const barData = report.map((p) => ({
    name: p.name.length > 16 ? p.name.slice(0, 14) + "…" : p.name,
    Occupied: p.occupied,
    Available: p.available,
    total: p.totalCapacity,
  }));

  // Type distribution
  const typeMap: Record<string, { occupied: number; total: number }> = {};
  for (const p of report) {
    if (!typeMap[p.type]) typeMap[p.type] = { occupied: 0, total: 0 };
    typeMap[p.type].occupied += p.occupied;
    typeMap[p.type].total += p.totalCapacity;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Properties", value: stats.properties },
          { label: "Total Beds", value: stats.totalCapacity },
          { label: "Occupied", value: stats.occupied },
          { label: "Unassigned Staff", value: stats.unassigned },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pie */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Occupancy Split</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} />
                <Tooltip formatter={(v) => [`${v} beds`]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Occupancy by Property</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} barSize={16}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="Occupied" fill="#6366f1" radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="Available" fill="#e2e8f0" radius={[3, 3, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Property detail table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Property Details</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Property</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Location</th>
                  <th className="text-center px-4 py-3 font-medium">Rooms</th>
                  <th className="text-center px-4 py-3 font-medium">Capacity</th>
                  <th className="text-center px-4 py-3 font-medium">Occupied</th>
                  <th className="px-4 py-3 font-medium w-40">Utilization</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      {!p.isActive && <span className="text-xs text-muted-foreground">(Inactive)</span>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                      {p.city ? `${p.city}` : p.address}
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{p.rooms}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">{p.totalCapacity}</td>
                    <td className="px-4 py-3 text-center font-medium">{p.occupied}</td>
                    <td className="px-4 py-3">
                      <UtilBar pct={p.utilization} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Room-level breakdown */}
      {report.map((p) => (
        <Card key={p.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{p.name} — Room Detail</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {p.roomDetails.map((r) => {
                const roomPct = r.capacity > 0 ? Math.round((r.activeOccupants.length / r.capacity) * 100) : 0;
                return (
                  <div key={r.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="w-24 shrink-0">
                      <p className="text-sm font-medium">Room {r.roomNumber}</p>
                      {r.floor && <p className="text-xs text-muted-foreground">Floor {r.floor}</p>}
                    </div>
                    <div className="flex-1">
                      {r.activeOccupants.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Vacant</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {r.activeOccupants.map((o) => (
                            <span key={o.assignmentId} className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs font-medium">
                              {o.employee.firstName} {o.employee.lastName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 w-32">
                      <p className="text-xs text-muted-foreground mb-1 text-right">{r.activeOccupants.length}/{r.capacity} beds</p>
                      <UtilBar pct={roomPct} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
