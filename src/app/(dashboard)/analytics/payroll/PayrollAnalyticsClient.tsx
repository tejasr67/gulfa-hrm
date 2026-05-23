"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, DollarSign, Users, Building2, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#84cc16", "#f97316"];

type PayrollData = {
  byMonth: { month: string; totalCost: number; employeeCount: number }[];
  byDepartment: { name: string; totalCost: number }[];
  ytdTotal: number;
  ytdCount: number;
  avgSalary: number;
  highestDept: string;
};

function fmtAED(n: number) {
  if (n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `AED ${(n / 1_000).toFixed(0)}K`;
  return `AED ${n.toLocaleString("en-AE")}`;
}

export function PayrollAnalyticsClient() {
  const [data, setData] = useState<PayrollData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch(`/api/analytics/payroll?year=${year}`);
      const j = await r.json();
      if (j.success) setData(j.data);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function downloadCSV() {
    window.open(`/api/analytics/payroll?year=${year}&format=csv`, "_blank");
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
    { title: `${year} YTD Total`, value: fmtAED(data.ytdTotal), icon: DollarSign, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Payslips Issued", value: data.ytdCount.toLocaleString(), icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
    { title: "Avg Net Salary", value: fmtAED(data.avgSalary), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Highest Dept", value: data.highestDept, icon: Building2, color: "text-amber-600", bg: "bg-amber-50" },
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
              <div className="text-xl font-bold truncate">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly cost line chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Payroll Cost — {year}</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.byMonth} margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => fmtAED(v).replace("AED ", "")} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v) => [fmtAED(Number(v)), "Payroll Cost"]} />
              <Legend />
              <Line type="monotone" dataKey="totalCost" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Total Cost" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employee count per run */}
        <Card>
          <CardHeader><CardTitle className="text-base">Employees per Payroll Run</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byMonth} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} employees`]} />
                <Bar dataKey="employeeCount" fill="#10b981" radius={[4, 4, 0, 0]} name="Employees" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department cost breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Payroll Cost by Department</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byDepartment.slice(0, 8)} layout="vertical" margin={{ top: 4, right: 8, bottom: 0, left: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => fmtAED(v).replace("AED ", "")} tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => [fmtAED(Number(v)), "Total Cost"]} />
                <Bar dataKey="totalCost" radius={[0, 4, 4, 0]}>
                  {data.byDepartment.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
