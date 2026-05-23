"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { LeaveBalanceSummary } from "@/modules/leave/types";

type Props = { balances: LeaveBalanceSummary[] };

export function LeaveBalanceCard({ balances }: Props) {
  if (balances.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No leave balances allocated for this year.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My Leave Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {balances.map((b) => {
          const usedPct = b.allocated > 0 ? Math.min(100, (b.used / b.allocated) * 100) : 0;
          const pendingPct = b.allocated > 0 ? Math.min(100 - usedPct, (b.pending / b.allocated) * 100) : 0;

          return (
            <div key={b.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{b.leaveType.name}</span>
                  {!b.leaveType.isPaid && (
                    <Badge variant="secondary" className="text-[10px]">Unpaid</Badge>
                  )}
                  {b.carried > 0 && (
                    <Badge variant="info" className="text-[10px]">+{b.carried} carried</Badge>
                  )}
                </div>
                <span className="text-muted-foreground tabular-nums">
                  <span className="font-semibold text-foreground">{b.remaining}</span>
                  /{b.allocated} days
                </span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all"
                  style={{ width: `${usedPct}%` }}
                />
                {pendingPct > 0 && (
                  <div
                    className="absolute top-0 h-full rounded-full bg-amber-400 transition-all"
                    style={{ left: `${usedPct}%`, width: `${pendingPct}%` }}
                  />
                )}
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>Used: {b.used}</span>
                {b.pending > 0 && <span className="text-amber-600">Pending: {b.pending}</span>}
                {b.encashed > 0 && <span>Encashed: {b.encashed}</span>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
