"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";
import type { ExpiryForecastPoint } from "@/modules/compliance/types";

type Props = { data: ExpiryForecastPoint[] };

export function ExpiryForecastChart({ data }: Props) {
  const formatted = data.map((d) => ({
    month: format(parseISO(`${d.month}-01`), "MMM yy"),
    expiring: d.expiring,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, fontSize: 13 }}
          labelStyle={{ fontWeight: 600 }}
          formatter={(v) => [v ?? 0, "Expiring"]}
        />
        <Bar dataKey="expiring" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
