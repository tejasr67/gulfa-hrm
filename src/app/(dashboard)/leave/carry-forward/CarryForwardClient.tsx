"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, RotateCcw, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { processYearEndCarryForward } from "@/modules/leave/actions";
import type { LeaveCarryForwardLogWithRelations } from "@/modules/leave/types";

type Summary = {
  logs: LeaveCarryForwardLogWithRelations[];
  totalEmployees: number;
  totalDaysCarried: number;
  totalDaysExpired: number;
};

type Props = { initialSummary: Summary; fromYear: number };

export function CarryForwardClient({ initialSummary, fromYear }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ processed?: number; error?: string } | null>(null);

  async function runCarryForward() {
    setProcessing(true);
    setResult(null);
    const res = await processYearEndCarryForward(fromYear);
    setProcessing(false);
    setResult(res);
    if (res.success) {
      const data = await fetch(`/api/leave/carry-forward?year=${fromYear}`).then((r) => r.json());
      setSummary(data);
    }
  }

  const alreadyProcessed = summary.logs.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Year-End Carry Forward — ${fromYear}`}
        description={`Process leave carry-forward from ${fromYear} to ${fromYear + 1}`}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/leave"><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Link>
          </Button>
        }
      />

      {/* Summary Stats */}
      {alreadyProcessed && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{summary.totalEmployees}</p>
              <p className="text-sm text-muted-foreground mt-1">Employees Processed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-emerald-600">{summary.totalDaysCarried}</p>
              <p className="text-sm text-muted-foreground mt-1">Days Carried Forward</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-amber-600">{summary.totalDaysExpired}</p>
              <p className="text-sm text-muted-foreground mt-1">Days Expired</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            {alreadyProcessed ? "Carry-Forward Complete" : "Run Carry-Forward"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {alreadyProcessed ? (
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                Carry-forward for {fromYear} has been processed. {summary.totalEmployees} employees updated.
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">This action is irreversible.</p>
                  <p className="mt-0.5">Remaining leave balances from {fromYear} will be carried forward to {fromYear + 1}, subject to each leave type's carry-forward cap. Days exceeding the cap will expire.</p>
                </div>
              </div>
              <Button onClick={runCarryForward} disabled={processing}>
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Process Carry-Forward for {fromYear}
              </Button>
            </>
          )}

          {result && !result.error && (
            <div className="flex items-center gap-2 text-emerald-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              Processed {result.processed} employee balances.
            </div>
          )}
          {result?.error && (
            <p className="text-sm text-destructive">{result.error}</p>
          )}
        </CardContent>
      </Card>

      {/* Log Table */}
      {summary.logs.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Carry-Forward Log</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-3">Employee ID</th>
                    <th className="px-4 py-3">Leave Type</th>
                    <th className="px-4 py-3">Days Carried</th>
                    <th className="px-4 py-3">Days Expired</th>
                    <th className="px-4 py-3">Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.logs.map((log) => (
                    <tr key={log.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-2 font-mono text-xs">{log.employeeId.slice(-8)}</td>
                      <td className="px-4 py-2">{log.leaveType.name}</td>
                      <td className="px-4 py-2 text-emerald-600 font-semibold">{log.daysCarried}d</td>
                      <td className="px-4 py-2 text-amber-600">{log.daysExpired > 0 ? `${log.daysExpired}d` : "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        {format(new Date(log.processedAt), "dd MMM yyyy HH:mm")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
