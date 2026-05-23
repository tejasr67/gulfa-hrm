import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getLeaveStats, getLeaveRequests, getLeaveTypes, getLeaveBalances } from "@/modules/leave/queries";
import { LeaveDashboardClient } from "./LeaveDashboardClient";

export const metadata: Metadata = { title: "Leave Management" };

export default async function LeavePage() {
  const session = await requireSession();
  const year = new Date().getFullYear();

  const [stats, requests, leaveTypes, myBalances] = await Promise.all([
    getLeaveStats(session.companyId),
    getLeaveRequests(session.companyId, { limit: 20 }),
    getLeaveTypes(session.companyId),
    session.employeeId ? getLeaveBalances(session.employeeId, year) : Promise.resolve([]),
  ]);

  return (
    <LeaveDashboardClient
      initialStats={stats}
      initialRequests={requests.data}
      leaveTypes={leaveTypes}
      myBalances={myBalances}
      employeeId={session.employeeId}
      role={session.role}
    />
  );
}
