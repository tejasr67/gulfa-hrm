"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { usePayrollReports } from "@/modules/payroll/hooks";
import type { PayrollSummaryReport } from "@/modules/payroll/types";

const MONTH_SHORT = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function fmtK(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n.toFixed(0);
}

export function PayrollReportsChart() {
  const { data, isLoading } = usePayrollReports();

  if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;

  const history: PayrollSummaryReport[] = data?.history ?? [];

  if (history.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No payroll data yet. Complete and approve payroll runs to see reports.
      </div>
    );
  }

  const chartData = history.map((h) => ({
    label: `${MONTH_SHORT[h.month]} ${String(h.year).slice(2)}`,
    gross: Math.round(h.totalGross),
    net: Math.round(h.totalNet),
    deductions: Math.round(h.totalDeductions),
    headcount: h.employeeCount,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-medium mb-4">Payroll Cost Trend (AED)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmtK} tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value, name) => [
                new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(Number(value)),
                String(name).charAt(0).toUpperCase() + String(name).slice(1),
              ]}
            />
            <Legend />
            <Bar dataKey="gross" fill="#6366f1" name="Gross" radius={[3, 3, 0, 0]} />
            <Bar dataKey="net" fill="#22c55e" name="Net" radius={[3, 3, 0, 0]} />
            <Bar dataKey="deductions" fill="#f97316" name="Deductions" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-4">Headcount vs Net Payroll</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="left" tickFormatter={fmtK} tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="net" stroke="#22c55e" name="Net Payroll (AED)" dot={false} strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="headcount" stroke="#6366f1" name="Employees" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
