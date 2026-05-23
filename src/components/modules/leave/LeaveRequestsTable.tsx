"use client";

import { useState } from "react";
import { format } from "date-fns";
import { MoreHorizontal, Eye, CheckCircle, XCircle, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmployeeAvatar } from "@/components/modules/employees/EmployeeAvatar";
import type { LeaveRequestWithRelations } from "@/modules/leave/types";

type Props = {
  requests: LeaveRequestWithRelations[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onView?: (id: string) => void;
  onCancel?: (id: string) => void;
  showEmployee?: boolean;
  showActions?: boolean;
  title?: string;
};

export function LeaveRequestsTable({
  requests,
  onApprove,
  onReject,
  onView,
  onCancel,
  showEmployee = true,
  showActions = true,
  title = "Leave Requests",
}: Props) {
  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No leave requests found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                {showEmployee && <th className="px-4 py-3">Employee</th>}
                <th className="px-4 py-3">Leave Type</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Reliever</th>
                {showActions && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b transition-colors hover:bg-muted/20">
                  {showEmployee && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <EmployeeAvatar
                          firstName={req.employee.firstName}
                          lastName={req.employee.lastName}
                          photo={req.employee.photo}
                          size="sm"
                        />
                        <div>
                          <p className="font-medium">{req.employee.firstName} {req.employee.lastName}</p>
                          <p className="text-xs text-muted-foreground">{req.employee.department?.name ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium">{req.leaveType.name}</span>
                      {req.isHalfDay && (
                        <Badge variant="secondary" className="ml-1 text-[10px]">
                          {req.halfDayPeriod === "MORNING" ? "AM" : "PM"} Half
                        </Badge>
                      )}
                    </div>
                    {req.reason && (
                      <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground">{req.reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    <div>{format(new Date(req.startDate), "dd MMM yyyy")}</div>
                    {req.startDate !== req.endDate && (
                      <div className="text-xs text-muted-foreground">
                        → {format(new Date(req.endDate), "dd MMM yyyy")}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {req.totalDays}d
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={req.status} type="leave" />
                    {req.currentApprovalStep > 1 && req.status === "IN_REVIEW" && (
                      <p className="mt-0.5 text-xs text-muted-foreground">Step {req.currentApprovalStep}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {req.reliever ? (
                      <div className="flex items-center gap-1.5">
                        <EmployeeAvatar firstName={req.reliever.firstName} lastName={req.reliever.lastName} photo={req.reliever.photo} size="sm" />
                        <span className="text-xs">{req.reliever.firstName}</span>
                        <StatusRelieverDot status={req.relieverStatus} />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  {showActions && (
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onView && (
                            <DropdownMenuItem onClick={() => onView(req.id)}>
                              <Eye className="mr-2 h-3.5 w-3.5" /> View Details
                            </DropdownMenuItem>
                          )}
                          {onApprove && ["PENDING", "IN_REVIEW"].includes(req.status) && (
                            <DropdownMenuItem onClick={() => onApprove(req.id)} className="text-emerald-600">
                              <CheckCircle className="mr-2 h-3.5 w-3.5" /> Approve
                            </DropdownMenuItem>
                          )}
                          {onReject && ["PENDING", "IN_REVIEW"].includes(req.status) && (
                            <DropdownMenuItem onClick={() => onReject(req.id)} className="text-red-600">
                              <XCircle className="mr-2 h-3.5 w-3.5" /> Reject
                            </DropdownMenuItem>
                          )}
                          {onCancel && ["PENDING", "IN_REVIEW", "PENDING_RELIEVER"].includes(req.status) && (
                            <DropdownMenuItem onClick={() => onCancel(req.id)} className="text-muted-foreground">
                              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusRelieverDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-400",
    ACCEPTED: "bg-emerald-500",
    DECLINED: "bg-red-500",
    NOT_REQUIRED: "hidden",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] ?? "hidden"}`} />;
}
