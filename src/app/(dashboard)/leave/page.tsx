import type { Metadata } from "next";
import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Leave Management" };

const QUICK_STATS = [
  { label: "Pending Approvals", value: "—", variant: "warning" as const },
  { label: "On Leave Today", value: "—", variant: "info" as const },
  { label: "Approved This Month", value: "—", variant: "success" as const },
  { label: "Rejected This Month", value: "—", variant: "danger" as const },
];

export default function LeavePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Management"
        description="Manage leave requests, balances, and policies"
        actions={
          <Button>Apply for Leave</Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {QUICK_STATS.map(({ label, value, variant }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{value}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={variant} className="text-[10px]">
                  {label}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No leave requests</p>
            <p className="text-sm text-muted-foreground">
              Connect your database to see leave requests here.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
