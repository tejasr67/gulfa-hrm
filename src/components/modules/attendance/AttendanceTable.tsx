"use client";

import { useState, useCallback } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, CheckCircle, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";
import { AttendanceFilters } from "./AttendanceFilters";
import { ManualEntryModal } from "./ManualEntryModal";
import { BulkUploadModal } from "./BulkUploadModal";
import { useAttendanceRecords, useShifts } from "@/modules/attendance/hooks";
import { approveOvertimeAction } from "@/modules/attendance/actions";
import type { AttendanceRecordRow, AttendanceFilters as Filters, ShiftScheduleRow } from "@/modules/attendance/types";
import { cn } from "@/lib/utils/cn";

type Department = { id: string; name: string };
type Employee = { id: string; firstName: string; lastName: string; employeeId: string };

type Props = {
  departments: Department[];
  employees: Employee[];
  initialShifts: ShiftScheduleRow[];
};

export function AttendanceTable({ departments, employees, initialShifts }: Props) {
  const today = new Date();
  const [manualOpen, setManualOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { data, loading, filters, setFilters, refetch } = useAttendanceRecords({
    startDate: new Date(today.getFullYear(), today.getMonth(), 1),
    endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0),
    page: 1,
    limit: 20,
  });
  const { shifts } = useShifts();
  const allShifts = (shifts as ShiftScheduleRow[]).length > 0 ? (shifts as ShiftScheduleRow[]) : initialShifts;

  const handleApproveOvertime = useCallback(async (id: string) => {
    await approveOvertimeAction(id, {});
    refetch();
  }, [refetch]);

  const columns: ColumnDef<AttendanceRecordRow>[] = [
    {
      id: "employee",
      header: "Employee",
      cell: ({ row }) => {
        const e = row.original.employee;
        return (
          <div>
            <p className="font-medium text-sm">{e.firstName} {e.lastName}</p>
            <p className="text-xs text-muted-foreground">{e.employeeId}</p>
          </div>
        );
      },
    },
    {
      id: "department",
      header: "Department",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.employee.department?.name ?? "—"}</span>
      ),
    },
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {(() => { try { return format(new Date(row.original.date), "d MMM yyyy"); } catch { return "—"; } })()}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <AttendanceStatusBadge status={row.original.status} />,
    },
    {
      id: "checkIn",
      header: "Check In",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {row.original.checkIn ? format(new Date(row.original.checkIn), "HH:mm") : "—"}
        </span>
      ),
    },
    {
      id: "checkOut",
      header: "Check Out",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {row.original.checkOut ? format(new Date(row.original.checkOut), "HH:mm") : "—"}
        </span>
      ),
    },
    {
      id: "workHours",
      header: "Hours",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.workHours != null ? `${row.original.workHours.toFixed(1)}h` : "—"}
        </span>
      ),
    },
    {
      id: "overtime",
      header: "OT",
      cell: ({ row }) => {
        const ot = row.original.overtime;
        const approved = row.original.approvedBy;
        if (!ot) return <span className="text-muted-foreground text-sm">—</span>;
        return (
          <div className="flex items-center gap-1">
            <span className={cn("text-sm tabular-nums", approved ? "text-emerald-600" : "text-amber-600")}>
              {ot.toFixed(1)}h
            </span>
            {approved && <CheckCircle className="h-3 w-3 text-emerald-500" />}
          </div>
        );
      },
    },
    {
      id: "shift",
      header: "Shift",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.shift?.name ?? "—"}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const r = row.original;
        const hasUnApprovedOT = r.overtime && r.overtime > 0 && !r.approvedBy;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2">
                <Edit2 className="h-3.5 w-3.5" /> Edit Record
              </DropdownMenuItem>
              {hasUnApprovedOT && (
                <DropdownMenuItem className="gap-2 text-amber-600" onClick={() => handleApproveOvertime(r.id)}>
                  <CheckCircle className="h-3.5 w-3.5" /> Approve Overtime
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const records = (data?.data ?? []) as AttendanceRecordRow[];

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = filters.page ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <AttendanceFilters
          filters={filters}
          onFiltersChange={setFilters}
          departments={departments}
          shifts={allShifts}
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>Bulk Upload</Button>
          <Button size="sm" onClick={() => setManualOpen(true)}>+ Add Record</Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12">
                    <EmptyState
                      title="No attendance records"
                      description="No records match your current filters"
                    />
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-sm text-muted-foreground">
          <span>{total} record{total !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-3">
            <Select
              value={String(filters.limit ?? 20)}
              onValueChange={(v) => setFilters({ ...filters, limit: Number(v), page: 1 })}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline" size="sm"
              disabled={currentPage <= 1}
              onClick={() => setFilters({ ...filters, page: currentPage - 1 })}
            >
              Previous
            </Button>
            <span className="tabular-nums">{currentPage} / {totalPages}</span>
            <Button
              variant="outline" size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setFilters({ ...filters, page: currentPage + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <ManualEntryModal
        open={manualOpen}
        onOpenChange={setManualOpen}
        employees={employees}
        shifts={allShifts}
        onSuccess={refetch}
      />
      <BulkUploadModal
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
