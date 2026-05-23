"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle, XCircle, Loader2, AlertCircle, CalendarDays, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmployeeAvatar } from "@/components/modules/employees/EmployeeAvatar";
import { processLeaveApproval } from "@/modules/leave/actions";
import type { LeaveRequestWithRelations } from "@/modules/leave/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: LeaveRequestWithRelations | null;
};

export function ApproveLeaveModal({ open, onClose, onSuccess, request }: Props) {
  const [action, setAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!request || !action) return;
    setLoading(true);
    setError(null);
    const result = await processLeaveApproval({ leaveRequestId: request.id, action, note: note || undefined });
    setLoading(false);
    if (!result.success) { setError(result.error ?? "Failed"); return; }
    setAction(null);
    setNote("");
    onSuccess();
    onClose();
  }

  function handleClose() {
    setAction(null);
    setNote("");
    setError(null);
    onClose();
  }

  if (!request) return null;

  const approvalActions = request.approvalActions ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Leave Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Info */}
          <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
            <EmployeeAvatar
              firstName={request.employee.firstName}
              lastName={request.employee.lastName}
              photo={request.employee.photo}
              size="md"
            />
            <div>
              <p className="font-semibold">{request.employee.firstName} {request.employee.lastName}</p>
              <p className="text-sm text-muted-foreground">{request.employee.department?.name ?? "—"}</p>
            </div>
            <StatusBadge status={request.status} type="leave" className="ml-auto" />
          </div>

          {/* Leave Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leave Type</p>
              <p className="font-medium">{request.leaveType.name}</p>
              {!request.leaveType.isPaid && <Badge variant="secondary" className="text-[10px]">Unpaid</Badge>}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Duration</p>
              <p className="font-medium">{request.totalDays} day{request.totalDays !== 1 ? "s" : ""}</p>
              {request.isHalfDay && <span className="text-xs text-muted-foreground">{request.halfDayPeriod} half-day</span>}
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Start Date</p>
              <p>{format(new Date(request.startDate), "dd MMM yyyy")}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End Date</p>
              <p>{format(new Date(request.endDate), "dd MMM yyyy")}</p>
            </div>
          </div>

          {request.reason && (
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reason</p>
              <p className="text-sm">{request.reason}</p>
            </div>
          )}

          {request.reliever && (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Reliever:</span>
              <span className="font-medium">{request.reliever.firstName} {request.reliever.lastName}</span>
              <StatusBadge status={request.relieverStatus} type="leave" className="ml-auto" />
            </div>
          )}

          {/* Approval History */}
          {approvalActions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approval History</p>
                {approvalActions.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-sm">
                    {a.action === "APPROVED"
                      ? <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500 shrink-0" />
                      : <XCircle className="mt-0.5 h-4 w-4 text-red-500 shrink-0" />}
                    <div>
                      <span className="font-medium capitalize">{a.action.toLowerCase()}</span>
                      <span className="text-muted-foreground"> · Step {a.step} · {format(new Date(a.createdAt), "dd MMM HH:mm")}</span>
                      {a.note && <p className="text-muted-foreground">{a.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Action Buttons */}
          {["PENDING", "IN_REVIEW"].includes(request.status) && (
            <>
              <Separator />
              {!action ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => setAction("REJECTED")}
                  >
                    <XCircle className="mr-2 h-4 w-4 text-red-500" /> Reject
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setAction("APPROVED")}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className={`rounded-lg border px-3 py-2 text-sm font-medium ${action === "APPROVED" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                    {action === "APPROVED" ? "Approving this request" : "Rejecting this request"}
                  </div>
                  <Textarea
                    placeholder={action === "REJECTED" ? "Reason for rejection (recommended)…" : "Note for employee (optional)…"}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                  {error && (
                    <div className="flex items-start gap-2 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setAction(null); setNote(""); }} className="flex-1">
                      Back
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={loading}
                      className={`flex-1 ${action === "REJECTED" ? "bg-red-600 hover:bg-red-700" : ""}`}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Confirm {action === "APPROVED" ? "Approval" : "Rejection"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
