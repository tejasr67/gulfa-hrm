"use client";

import { useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatDate, formatDateTime } from "@/lib/utils/formatters";
import { useEmployeeAttendance } from "@/modules/employees/hooks";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => CURRENT_YEAR - i);

export function AttendanceTab({ employeeId }: { employeeId: string }) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [page, setPage] = useState(1);

  const { data, total, totalPages, isLoading, error } = useEmployeeAttendance(employeeId, { year, month, page });

  function handleYearChange(val: string) { setYear(Number(val)); setPage(1); }
  function handleMonthChange(val: string) { setMonth(Number(val)); setPage(1); }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Select value={String(year)} onValueChange={handleYearChange}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(month)} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m, i) => (
              <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!isLoading && (
          <span className="text-sm text-muted-foreground ml-auto tabular-nums">
            {total} record{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                {["Date", "Status", "Check In", "Check Out", "Hours", "Notes"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse w-20" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No attendance records"
          description="No attendance data found for this period."
        />
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Check In</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Check Out</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Hours</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.map((record) => (
                <tr key={record.id} className="border-b hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap font-medium">
                    {formatDate(record.date)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={record.status} type="attendance" />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {record.checkIn ? formatDateTime(record.checkIn) : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {record.checkOut ? formatDateTime(record.checkOut) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {record.workHours != null ? `${record.workHours.toFixed(1)}h` : "—"}
                    {record.overtime != null && record.overtime > 0 && (
                      <span className="text-xs text-amber-600 ml-1.5">+{record.overtime.toFixed(1)}OT</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="text-xs text-muted-foreground truncate">{record.notes ?? "—"}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1 || isLoading} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
