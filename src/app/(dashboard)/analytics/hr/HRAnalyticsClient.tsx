"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, TrendingUp, Users, UserMinus, Clock } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1"];

type HRData = {
  headcountTrend: { month: string; total: number; hires: number; terminations: number }[];
  byDepartment: { name: string; count: number }[];
  byNationality: { nationality: string; count: number }[];
  byEmploymentType: { type: string; count: number }[];
  totalActive: number;
  avgTenureMonths: number;
  turnoverRate: number;
};

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERN: "Intern",
  FREELANCE: "Freelance",
};

export function HRAnalyticsClient() {
  const [data, setData] = useState<HRData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch(`/api/analytics/hr?year=${year}`);
      const j = await r.json();
      if (j.success) setData(j.data);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function downloadCSV() {
    window.open(`/api/analytics/hr?year=${year}&format=csv`, "_blank");
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
    { title: "Active Employees", value: data.totalActive, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Avg Tenure", value: `${data.avgTenureMonths}mo`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Turnover Rate", value: `${data.turnoverRate}%`, icon: UserMinus, color: "text-red-600", bg: "bg-red-50" },
    {
      title: `${year} Hires`,
      value: data.headcountTrend.reduce((s, m) => s + m.hires, 0),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3">
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

      {/* Headcount trend */}
      <Card>
        <CardHeader><CardTitle className="text-base">Headcount Trend — {year}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.headcountTrend} margin={{ top: 4, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} name="Headcount" />
              <Line type="monotone" dataKey="hires" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Hires" />
              <Line type="monotone" dataKey="terminations" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="Terminations" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Department breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Headcount by Department</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.byDepartment.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => [`${v} employees`]} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Nationality breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Nationality Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.byNationality} dataKey="count" nameKey="nationality" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {data.byNationality.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} employees`]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Employment type */}
        <Card>
          <CardHeader><CardTitle className="text-base">Employment Type</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={data.byEmploymentType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80}>
                  {data.byEmploymentType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, _, p) => [`${v} employees`, TYPE_LABELS[String(p.payload.type)] ?? p.payload.type]} />
                <Legend formatter={(v) => TYPE_LABELS[v] ?? v} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hires vs terminations bar */}
        <Card>
          <CardHeader><CardTitle className="text-base">Hires vs Terminations — {year}</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.headcountTrend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="hires" fill="#10b981" name="Hires" radius={[4, 4, 0, 0]} />
                <Bar dataKey="terminations" fill="#ef4444" name="Terminations" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
