import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getPendingApprovals } from "@/modules/leave/queries";
import { ApprovalsClient } from "./ApprovalsClient";

export const metadata: Metadata = { title: "Leave Approvals" };

export default async function ApprovalsPage() {
  const session = await requireSession();
  const requests = await getPendingApprovals(session.companyId, session.userId);
  return <ApprovalsClient initialRequests={requests} />;
}
