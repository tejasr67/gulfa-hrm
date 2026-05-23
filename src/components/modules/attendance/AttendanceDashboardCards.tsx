"use client";

import { UserCheck, UserX, Clock, Activity, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceSummary, DepartmentAttendanceStat, AttendanceTrend } from "@/modules/attendance/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format, parseISO } from "date-fns";

type Props = {
  summary: AttendanceSummary;
  departments: DepartmentAttendanceStat[];
  trends: AttendanceTrend[];
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className={`p-3 rounded-xl ${colorClass}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AttendanceDashboardCards({ summary, departments, trends }: Props) {
  const { today, thisMonth } = summary;

  const trendData = trends.map((t) => ({
    ...t,
    date: (() => {
      try {
        return format(parseISO(t.date), "MMM d");
      } catch {
        return t.date;
      }
    })(),
  }));

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          title="Present"
          value={today.present}
          subtitle={`${today.attendanceRate}% rate`}
          icon={UserCheck}
          colorClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <StatCard
          title="Absent"
          value={today.absent}
          subtitle="Not checked in"
          icon={UserX}
          colorClass="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        />
        <StatCard
          title="Late"
          value={today.late}
          subtitle="After grace period"
          icon={Clock}
          colorClass="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatCard
          title="Remote"
          value={today.remote}
          subtitle="Working from home"
          icon={Activity}
          colorClass="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          title="On Leave"
          value={today.onLeave}
          subtitle="Approved leave"
          icon={Users}
          colorClass="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
        />
        <StatCard
          title="Overtime"
          value={`${today.totalOvertimeHours.toFixed(1)}h`}
          subtitle={`${thisMonth.totalOvertimeHours.toFixed(1)}h this month`}
          icon={TrendingUp}
          colorClass="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Attendance Trend (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No trend data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#10b981" fill="url(#presentGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" fill="url(#absentGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Department breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">By Department (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No department data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={departments.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="departmentName" type="category" tick={{ fontSize: 11 }} width={80} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="present" name="Present" fill="#10b981" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Month summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Work Days This Month", value: thisMonth.totalWorkDays },
          { label: "Avg Attendance Rate", value: `${thisMonth.avgAttendanceRate}%` },
          { label: "Total Overtime Hours", value: `${thisMonth.totalOvertimeHours.toFixed(1)}h` },
          { label: "Total Absences", value: thisMonth.totalAbsences },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
