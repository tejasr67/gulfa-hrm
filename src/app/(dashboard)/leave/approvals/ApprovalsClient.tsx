"use client";

import { useState } from "react";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { LeaveRequestsTable } from "@/components/modules/leave/LeaveRequestsTable";
import { ApproveLeaveModal } from "@/components/modules/leave/ApproveLeaveModal";
import type { LeaveRequestWithRelations } from "@/modules/leave/types";

type Props = { initialRequests: LeaveRequestWithRelations[] };

export function ApprovalsClient({ initialRequests }: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [selected, setSelected] = useState<LeaveRequestWithRelations | null>(null);

  async function refresh() {
    const data = await fetch("/api/leave/approvals/pending").then((r) => r.json());
    setRequests(data ?? []);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Approvals"
        description="Review and action pending leave requests"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/leave"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
          </Button>
        }
      />

      {requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="h-12 w-12 text-emerald-500 mb-3" />
          <p className="text-lg font-semibold">All caught up!</p>
          <p className="text-sm text-muted-foreground">No pending approvals at this time.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {requests.length} request{requests.length !== 1 ? "s" : ""} awaiting your review
            </span>
          </div>

          <LeaveRequestsTable
            requests={requests}
            title="Pending Approvals"
            onApprove={(id) => setSelected(requests.find((r) => r.id === id) ?? null)}
            onReject={(id) => setSelected(requests.find((r) => r.id === id) ?? null)}
            onView={(id) => setSelected(requests.find((r) => r.id === id) ?? null)}
          />
        </>
      )}

      <ApproveLeaveModal
        open={!!selected}
        onClose={() => setSelected(null)}
        onSuccess={refresh}
        request={selected}
      />
    </div>
  );
}
