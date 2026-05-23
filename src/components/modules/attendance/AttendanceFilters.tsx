"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import type { AttendanceFilters } from "@/modules/attendance/types";
import type { ShiftScheduleRow } from "@/modules/attendance/types";

const STATUSES = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "REMOTE", label: "Remote" },
  { value: "HOLIDAY", label: "Holiday" },
  { value: "WEEKEND", label: "Weekend" },
];

type Department = { id: string; name: string };

type Props = {
  filters: AttendanceFilters;
  onFiltersChange: (f: AttendanceFilters) => void;
  departments: Department[];
  shifts: ShiftScheduleRow[];
};

export function AttendanceFilters({ filters, onFiltersChange, departments, shifts }: Props) {
  const hasFilters = !!(filters.search || filters.status || filters.departmentId || filters.shiftId || filters.startDate || filters.endDate);

  const update = (partial: Partial<AttendanceFilters>) => {
    onFiltersChange({ ...filters, ...partial, page: 1 });
  };

  const clear = () => {
    onFiltersChange({ page: 1, limit: filters.limit });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search employee..."
          value={filters.search ?? ""}
          onChange={(e) => update({ search: e.target.value })}
          className="pl-9"
        />
      </div>

      <Input
        type="date"
        value={filters.startDate ? filters.startDate.toISOString().split("T")[0] : ""}
        onChange={(e) => update({ startDate: e.target.value ? new Date(e.target.value) : undefined })}
        className="w-36"
      />
      <Input
        type="date"
        value={filters.endDate ? filters.endDate.toISOString().split("T")[0] : ""}
        onChange={(e) => update({ endDate: e.target.value ? new Date(e.target.value) : undefined })}
        className="w-36"
      />

      <Select
        value={filters.status ?? "_all"}
        onValueChange={(v) => update({ status: v === "_all" ? undefined : v as AttendanceFilters["status"] })}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">All Statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {departments.length > 0 && (
        <Select
          value={filters.departmentId ?? "_all"}
          onValueChange={(v) => update({ departmentId: v === "_all" ? undefined : v })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {shifts.length > 0 && (
        <Select
          value={filters.shiftId ?? "_all"}
          onValueChange={(v) => update({ shiftId: v === "_all" ? undefined : v })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Shift" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Shifts</SelectItem>
            {shifts.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clear} className="gap-1.5">
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}
