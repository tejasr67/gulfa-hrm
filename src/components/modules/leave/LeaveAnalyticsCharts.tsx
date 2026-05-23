"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaveAnalytics } from "@/modules/leave/types";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16"];

type Props = { analytics: LeaveAnalytics };

export function LeaveAnalyticsCharts({ analytics }: Props) {
  const monthLabels = analytics.byMonth.map((m) => {
    const [year, month] = m.month.split("-");
    return { ...m, label: new Date(Number(year), Number(month) - 1).toLocaleString("en-AE", { month: "short" }) };
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Leave Days by Month */}
      <Card>
        <CardHeader><CardTitle className="text-base">Leave Days by Month</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthLabels} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v} days`, "Leave"]} />
              <Bar dataKey="days" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* By Leave Type */}
      <Card>
        <CardHeader><CardTitle className="text-base">Leave Days by Type</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={analytics.byLeaveType}
                dataKey="days"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
              >
                {analytics.byLeaveType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${v} days`]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* By Department */}
      <Card>
        <CardHeader><CardTitle className="text-base">Leave Days by Department</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={analytics.byDepartment}
              layout="vertical"
              margin={{ top: 4, right: 8, bottom: 0, left: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v) => [`${v} days`, "Leave"]} />
              <Bar dataKey="days" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Leave Takers */}
      <Card>
        <CardHeader><CardTitle className="text-base">Top Leave Takers</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.topTakers.slice(0, 8).map((e, i) => (
              <div key={e.employeeId} className="flex items-center gap-3">
                <span className="w-5 text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="font-medium">{e.employeeName}</span>
                    <span className="tabular-nums text-muted-foreground">{e.days}d</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, (e.days / (analytics.topTakers[0]?.days || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
