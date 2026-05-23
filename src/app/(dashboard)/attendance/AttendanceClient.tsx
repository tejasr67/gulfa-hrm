"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceDashboardCards } from "@/components/modules/attendance/AttendanceDashboardCards";
import { AttendanceTable } from "@/components/modules/attendance/AttendanceTable";
import type { AttendanceSummary, DepartmentAttendanceStat, AttendanceTrend, ShiftScheduleRow } from "@/modules/attendance/types";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { format, parseISO } from "date-fns";

type Department = { id: string; name: string };
type Employee = { id: string; firstName: string; lastName: string; employeeId: string };

type Props = {
  initialSummary: AttendanceSummary;
  initialDepartments: DepartmentAttendanceStat[];
  initialTrends: AttendanceTrend[];
  departments: Department[];
  employees: Employee[];
  shifts: ShiftScheduleRow[];
};

function AttendanceAnalyticsTab({ companyTrends }: { companyTrends: AttendanceTrend[] }) {
  const [trends, setTrends] = useState(companyTrends);
  const [range, setRange] = useState<30 | 60 | 90>(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/attendance/trends?days=${range}`)
      .then((r) => r.json())
      .then((d) => setTrends(d.data ?? d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  const chartData = trends.map((t) => ({
    ...t,
    date: (() => { try { return format(parseISO(t.date), "MMM d"); } catch { return t.date; } })(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Attendance Analytics</h3>
        <div className="flex items-center gap-2">
          {([30, 60, 90] as const).map((d) => (
            <Button key={d} variant={range === d ? "default" : "outline"} size="sm" onClick={() => setRange(d)}>
              {d}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance vs Absences</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm animate-pulse">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Overtime Hours Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-sm animate-pulse">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="overtimeHours" name="Overtime (h)" stroke="#f97316" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AttendanceClient({
  initialSummary,
  initialDepartments,
  initialTrends,
  departments,
  employees,
  shifts,
}: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [departments_, setDepartments] = useState(initialDepartments);
  const [trends, setTrends] = useState(initialTrends);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/attendance/stats");
      if (res.ok) {
        const json = await res.json();
        const d = json.data ?? json;
        if (d.summary) setSummary(d.summary);
        if (d.departments) setDepartments(d.departments);
        if (d.trends) setTrends(d.trends);
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <AttendanceDashboardCards
            summary={summary}
            departments={departments_}
            trends={trends}
          />
        </TabsContent>

        <TabsContent value="records">
          <AttendanceTable
            departments={departments}
            employees={employees}
            initialShifts={shifts}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <AttendanceAnalyticsTab companyTrends={trends} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
