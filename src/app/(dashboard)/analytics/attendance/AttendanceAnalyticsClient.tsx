"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, UserCheck, UserX, Clock, TrendingDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, AreaChart, Area,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AttendanceData = {
  daily: { date: string; present: number; absent: number; late: number; onLeave: number }[];
  byDepartment: { name: string; rate: number; present: number; expected: number }[];
  monthly: { month: string; rate: number; avgWorkHours: number }[];
  avgRate: number;
  totalLate: number;
  totalAbsent: number;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function AttendanceAnalyticsClient() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch(`/api/analytics/attendance?year=${year}&month=${month}`);
      const j = await r.json();
      if (j.success) setData(j.data);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function downloadCSV() {
    window.open(`/api/analytics/attendance?year=${year}&format=csv`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (!data) return <p className="text-sm text-muted-foreground">Failed to load analytics.</p>;

  const statCards = [
    { title: "Avg Attendance Rate", value: `${data.avgRate}%`, icon: UserCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Total Late", value: data.totalLate, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { title: "Total Absent", value: data.totalAbsent, icon: UserX, color: "text-red-600", bg: "bg-red-50" },
    {
      title: "Lowest Month",
      value: data.monthly.reduce((min, m) => m.rate < min.rate ? m : min, data.monthly[0] ?? { month: "—", rate: 0 }).month,
      icon: TrendingDown,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {yearOptions.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${year === y ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {y}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {MONTH_NAMES.map((name, i) => (
            <button
              key={i}
              onClick={() => setMonth(i + 1)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${month === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" className="ml-auto" onClick={downloadCSV}>
          <Download className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ title, value, icon: Icon, color, bg }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <div className={`rounded-lg p-2 ${bg}`}><Icon className={`h-4 w-4 ${color}`} /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly attendance rate trend */}
      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Attendance Rate — {year}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.monthly} margin={{ top: 4, right: 16, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, "Attendance Rate"]} />
              <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} fill="url(#rateGrad)" dot={{ r: 3 }} name="Rate" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily breakdown for selected month */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Daily Breakdown — {MONTH_NAMES[month - 1]} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.daily.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No records for this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.daily} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#10b981" stackId="a" name="Present" />
                  <Bar dataKey="absent" fill="#ef4444" stackId="a" name="Absent" />
                  <Bar dataKey="onLeave" fill="#3b82f6" stackId="a" name="On Leave" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Department attendance rate */}
        <Card>
          <CardHeader><CardTitle className="text-base">Attendance Rate by Department</CardTitle></CardHeader>
          <CardContent>
            {data.byDepartment.length === 0 ? (
              <p className="text-sm text-muted-foreground py-10 text-center">No department data for this period.</p>
            ) : (
              <div className="space-y-3">
                {data.byDepartment.slice(0, 8).map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium truncate">{d.name}</span>
                      <span className={`font-semibold tabular-nums ml-2 shrink-0 ${d.rate >= 90 ? "text-emerald-600" : d.rate >= 75 ? "text-amber-600" : "text-red-600"}`}>
                        {d.rate}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${d.rate >= 90 ? "bg-emerald-500" : d.rate >= 75 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${d.rate}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.present}/{d.expected} days</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Avg work hours trend */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Avg Work Hours per Day — {year}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.monthly} margin={{ top: 4, right: 16, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 12]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v}h`, "Avg Work Hours"]} />
                <Line type="monotone" dataKey="avgWorkHours" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Avg Hours" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
