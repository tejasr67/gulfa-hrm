import type { Metadata } from "next";
import Link from "next/link";
import { Users, DollarSign, Clock, Shield, ChevronRight, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { getHRAnalytics, getPayrollAnalytics, getAttendanceAnalytics } from "@/modules/analytics/queries";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const { companyId } = await requireSession();
  const year = new Date().getFullYear();

  const [hr, payroll, attendance] = await Promise.all([
    getHRAnalytics(companyId, year),
    getPayrollAnalytics(companyId, year),
    getAttendanceAnalytics(companyId, year),
  ]);

  const dashboards = [
    {
      href: "/analytics/hr",
      icon: Users,
      title: "HR Analytics",
      description: "Headcount trends, department breakdown, nationality distribution",
      color: "text-blue-600",
      bg: "bg-blue-50",
      stats: [
        { label: "Active Employees", value: hr.totalActive },
        { label: "Avg Tenure", value: `${hr.avgTenureMonths}mo` },
        { label: "Turnover Rate", value: `${hr.turnoverRate}%` },
      ],
    },
    {
      href: "/analytics/payroll",
      icon: DollarSign,
      title: "Payroll Analytics",
      description: "Monthly payroll costs, department breakdown, salary distribution",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      stats: [
        { label: "YTD Total", value: payroll.ytdTotal > 0 ? `AED ${(payroll.ytdTotal / 1000).toFixed(0)}K` : "—" },
        { label: "Avg Salary", value: payroll.avgSalary > 0 ? `AED ${(payroll.avgSalary / 1000).toFixed(1)}K` : "—" },
        { label: "Payslips", value: payroll.ytdCount },
      ],
    },
    {
      href: "/analytics/attendance",
      icon: Clock,
      title: "Attendance Analytics",
      description: "Daily attendance trends, department rates, monthly patterns",
      color: "text-purple-600",
      bg: "bg-purple-50",
      stats: [
        { label: "Avg Rate", value: `${attendance.avgRate}%` },
        { label: "Late Records", value: attendance.totalLate },
        { label: "Absent Records", value: attendance.totalAbsent },
      ],
    },
    {
      href: "/compliance/analytics",
      icon: Shield,
      title: "Compliance Analytics",
      description: "Document expiry forecast, department compliance rates",
      color: "text-amber-600",
      bg: "bg-amber-50",
      stats: [
        { label: "Visa & doc expiry", value: "Forecast" },
        { label: "Dept compliance", value: "Breakdown" },
        { label: "12-month view", value: "→" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Enterprise dashboards across HR, payroll, attendance, and compliance"
      />

      <div className="grid gap-5 md:grid-cols-2">
        {dashboards.map((d) => (
          <Link key={d.href} href={d.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2.5 ${d.bg}`}>
                      <d.icon className={`h-5 w-5 ${d.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{d.title}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform mt-1" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                  {d.stats.map((s) => (
                    <div key={s.label}>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="text-sm font-semibold mt-0.5">{String(s.value)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick links to existing analytics pages */}
      <div className="rounded-xl border p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Module Analytics</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { href: "/leave/analytics", label: "Leave Analytics" },
            { href: "/compliance/analytics", label: "Compliance Analytics" },
            { href: "/payroll/reports", label: "Payroll Reports" },
            { href: "/assets/reports", label: "Asset Reports" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-muted transition-colors"
            >
              {l.label}
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
