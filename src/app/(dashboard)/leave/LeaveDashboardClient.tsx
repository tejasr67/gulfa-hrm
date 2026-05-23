"use client";

import { useState } from "react";
import { Calendar, CheckCircle, TrendingUp, Users, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/PageHeader";
import { LeaveStatsBar } from "@/components/modules/leave/LeaveStatsBar";
import { LeaveBalanceCard } from "@/components/modules/leave/LeaveBalanceCard";
import { LeaveRequestsTable } from "@/components/modules/leave/LeaveRequestsTable";
import { ApplyLeaveModal } from "@/components/modules/leave/ApplyLeaveModal";
import { ApproveLeaveModal } from "@/components/modules/leave/ApproveLeaveModal";
import type { LeaveStats, LeaveRequestWithRelations, LeaveBalanceSummary, LeaveTypeWithConfig } from "@/modules/leave/types";
import Link from "next/link";

type Props = {
  initialStats: LeaveStats;
  initialRequests: LeaveRequestWithRelations[];
  leaveTypes: LeaveTypeWithConfig[];
  myBalances: LeaveBalanceSummary[];
  employeeId: string | null;
  role: string;
};

const canApprove = (role: string) => ["ADMIN", "HR_MANAGER", "MANAGER"].includes(role);

export function LeaveDashboardClient({
  initialStats,
  initialRequests,
  leaveTypes,
  myBalances,
  employeeId,
  role,
}: Props) {
  const [stats, setStats] = useState(initialStats);
  const [requests, setRequests] = useState(initialRequests);
  const [applyOpen, setApplyOpen] = useState(false);
  const [approveRequest, setApproveRequest] = useState<LeaveRequestWithRelations | null>(null);

  async function refresh() {
    const [statsRes, reqRes] = await Promise.all([
      fetch("/api/leave/stats").then((r) => r.json()),
      fetch("/api/leave/requests?limit=20").then((r) => r.json()),
    ]);
    setStats(statsRes);
    setRequests(reqRes.data ?? []);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        description="Manage leave requests, balances, and team availability"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/leave/calendar"><Calendar className="mr-1.5 h-4 w-4" />Calendar</Link>
            </Button>
            {canApprove(role) && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/leave/approvals">
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                  Approvals
                  {stats.pendingApprovals > 0 && (
                    <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {stats.pendingApprovals}
                    </span>
                  )}
                </Link>
              </Button>
            )}
            {employeeId && (
              <Button size="sm" onClick={() => setApplyOpen(true)}>
                Apply for Leave
              </Button>
            )}
          </div>
        }
      />

      <LeaveStatsBar stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Balance Sidebar */}
        {myBalances.length > 0 && (
          <div className="lg:col-span-1">
            <LeaveBalanceCard balances={myBalances} />
          </div>
        )}

        {/* Requests Table */}
        <div className={myBalances.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
          <Tabs defaultValue="all">
            <div className="flex items-center justify-between mb-3">
              <TabsList>
                <TabsTrigger value="all">All Requests</TabsTrigger>
                {employeeId && <TabsTrigger value="mine">My Requests</TabsTrigger>}
                {canApprove(role) && <TabsTrigger value="pending">Pending</TabsTrigger>}
              </TabsList>
              <Button variant="ghost" size="sm" onClick={refresh}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Refresh
              </Button>
            </div>

            <TabsContent value="all">
              <LeaveRequestsTable
                requests={requests}
                onView={(id) => setApproveRequest(requests.find((r) => r.id === id) ?? null)}
                onApprove={canApprove(role) ? (id) => setApproveRequest(requests.find((r) => r.id === id) ?? null) : undefined}
                onReject={canApprove(role) ? (id) => setApproveRequest(requests.find((r) => r.id === id) ?? null) : undefined}
              />
            </TabsContent>

            {employeeId && (
              <TabsContent value="mine">
                <LeaveRequestsTable
                  requests={requests.filter((r) => r.employeeId === employeeId)}
                  showEmployee={false}
                  title="My Leave Requests"
                />
              </TabsContent>
            )}

            {canApprove(role) && (
              <TabsContent value="pending">
                <LeaveRequestsTable
                  requests={requests.filter((r) => ["PENDING", "IN_REVIEW"].includes(r.status))}
                  title="Pending Approvals"
                  onApprove={(id) => setApproveRequest(requests.find((r) => r.id === id) ?? null)}
                  onReject={(id) => setApproveRequest(requests.find((r) => r.id === id) ?? null)}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href="/leave/calendar" icon={Calendar} label="Team Calendar" />
        <QuickLink href="/leave/analytics" icon={TrendingUp} label="Analytics" />
        {canApprove(role) && <QuickLink href="/leave/approvals" icon={CheckCircle} label="Approvals Queue" />}
        {canApprove(role) && <QuickLink href="/leave/carry-forward" icon={RotateCcw} label="Carry Forward" />}
      </div>

      {/* Modals */}
      {employeeId && (
        <ApplyLeaveModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          onSuccess={refresh}
          employeeId={employeeId}
          leaveTypes={leaveTypes}
        />
      )}
      <ApproveLeaveModal
        open={!!approveRequest}
        onClose={() => setApproveRequest(null)}
        onSuccess={refresh}
        request={approveRequest}
      />
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/60"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {label}
    </Link>
  );
}
