import type { Metadata } from "next";
import {
  Users,
  Clock,
  Calendar,
  FileWarning,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { getEmployeeStats } from "@/modules/employees/queries";
import { getDashboardStats } from "@/modules/dashboard/queries";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();
  const [empStats, dashStats] = await Promise.all([
    getEmployeeStats(session.companyId),
    getDashboardStats(session.companyId),
  ]);

  const STAT_CARDS = [
    {
      title: "Total Employees",
      value: String(empStats.total),
      change: `${empStats.active} active`,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Present Today",
      value: String(dashStats.presentToday),
      change: "Attendance rate",
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "On Leave",
      value: String(empStats.onLeave),
      change: "Active leave",
      icon: Calendar,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Pending Requests",
      value: String(dashStats.pendingLeave),
      change: "Needs approval",
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Expiring Documents",
      value: String(dashStats.expiringDocuments),
      change: "Next 30 days",
      icon: FileWarning,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "This Month Payroll",
      value: dashStats.monthlyPayroll > 0 ? `AED ${dashStats.monthlyPayroll.toLocaleString("en-AE")}` : "AED —",
      change: "Estimated net",
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome to Gulfa HRM — your workforce at a glance"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_CARDS.map(({ title, value, change, icon: Icon, color, bg }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Activity feed coming soon.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document Expiry Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {dashStats.expiringDocuments > 0 ? (
              <p className="text-sm text-destructive font-medium">
                {dashStats.expiringDocuments} document{dashStats.expiringDocuments !== 1 ? "s" : ""} expiring in the next 30 days.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No documents expiring in the next 30 days.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
