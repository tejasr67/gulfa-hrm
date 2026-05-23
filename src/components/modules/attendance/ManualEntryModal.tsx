"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createAttendanceRecordAction } from "@/modules/attendance/actions";
import type { ShiftScheduleRow } from "@/modules/attendance/types";

type Employee = { id: string; firstName: string; lastName: string; employeeId: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  shifts: ShiftScheduleRow[];
  onSuccess: () => void;
};

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

export function ManualEntryModal({ open, onOpenChange, employees, shifts, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    status: "PRESENT",
    checkIn: "",
    checkOut: "",
    shiftId: "",
    workHours: "",
    overtime: "",
    notes: "",
  });

  const update = (key: keyof typeof form, val: string) => setForm((f) => ({ ...f, [key]: val }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await createAttendanceRecordAction({
        employeeId: form.employeeId,
        date: new Date(form.date),
        status: form.status,
        checkIn: form.checkIn || undefined,
        checkOut: form.checkOut || undefined,
        shiftId: form.shiftId || undefined,
        workHours: form.workHours ? parseFloat(form.workHours) : undefined,
        overtime: form.overtime ? parseFloat(form.overtime) : undefined,
        notes: form.notes || undefined,
      });
      if (!result.success) { setError(result.error ?? "Failed"); return; }
      onOpenChange(false);
      onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manual Attendance Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium leading-none">Employee *</label>
              <Select value={form.employeeId} onValueChange={(v) => update("employeeId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.firstName} {e.lastName} ({e.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">Date *</label>
              <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">Status *</label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">Check In</label>
              <Input type="time" value={form.checkIn} onChange={(e) => update("checkIn", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">Check Out</label>
              <Input type="time" value={form.checkOut} onChange={(e) => update("checkOut", e.target.value)} />
            </div>

            {shifts.length > 0 && (
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-medium leading-none">Shift</label>
                <Select value={form.shiftId || "_none"} onValueChange={(v) => update("shiftId", v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="No shift assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">No shift</SelectItem>
                    {shifts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">Work Hours</label>
              <Input type="number" step="0.5" min="0" max="24" placeholder="8.0" value={form.workHours} onChange={(e) => update("workHours", e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">Overtime Hours</label>
              <Input type="number" step="0.5" min="0" max="12" placeholder="0.0" value={form.overtime} onChange={(e) => update("overtime", e.target.value)} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium leading-none">Notes</label>
              <Textarea rows={2} placeholder="Optional notes..." value={form.notes} onChange={(e) => update("notes", e.target.value)} />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !form.employeeId}>
              {submitting ? "Saving..." : "Save Attendance"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
