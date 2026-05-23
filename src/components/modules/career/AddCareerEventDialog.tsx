"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EmployeeSearchInput } from "@/components/shared/EmployeeSearchInput";
import { useCreateCareerEvent } from "@/modules/career/hooks";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledEmployeeId?: string; // database id (cuid) pre-filled from employee detail page
};

const EVENT_TYPES = [
  { value: "PROMOTION", label: "Promotion" },
  { value: "DEMOTION", label: "Demotion" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "ROLE_CHANGE", label: "Role / Designation Change" },
  { value: "SALARY_REVISION", label: "Salary Revision" },
  { value: "PROBATION_COMPLETION", label: "Probation Completion" },
  { value: "MANAGER_CHANGE", label: "Reporting Manager Change" },
];

const SHOWS_SALARY = ["SALARY_REVISION", "PROMOTION", "DEMOTION"];
const SHOWS_POSITION = ["PROMOTION", "DEMOTION", "ROLE_CHANGE", "PROBATION_COMPLETION"];
const SHOWS_DEPARTMENT = ["TRANSFER"];
const SHOWS_MANAGER = ["MANAGER_CHANGE"];

export function AddCareerEventDialog({ open, onClose, onSuccess, prefilledEmployeeId }: Props) {
  const { trigger, isMutating } = useCreateCareerEvent();
  const [employeeDbId, setEmployeeDbId] = useState(prefilledEmployeeId ?? "");
  const [managerDbId, setManagerDbId] = useState("");
  const [form, setForm] = useState({
    type: "",
    effectiveDate: "",
    fromPosition: "",
    toPosition: "",
    fromDepartment: "",
    toDepartment: "",
    fromSalary: "",
    toSalary: "",
    reason: "",
    notes: "",
    approvedBy: "",
  });
  const [error, setError] = useState("");

  function set(key: string, v: string) { setForm((p) => ({ ...p, [key]: v })); }

  const showSalary = SHOWS_SALARY.includes(form.type);
  const showPosition = SHOWS_POSITION.includes(form.type);
  const showDepartment = SHOWS_DEPARTMENT.includes(form.type);
  const showManager = SHOWS_MANAGER.includes(form.type);

  async function handleSubmit() {
    setError("");
    if (!employeeDbId || !form.type || !form.effectiveDate) {
      setError("Employee, type, and effective date are required.");
      return;
    }
    const res = await trigger({
      employeeId: employeeDbId,
      type: form.type,
      effectiveDate: form.effectiveDate,
      fromPosition: form.fromPosition || undefined,
      toPosition: form.toPosition || undefined,
      fromDepartment: form.fromDepartment || undefined,
      toDepartment: form.toDepartment || undefined,
      toManagerId: managerDbId || undefined,
      fromSalary: form.fromSalary ? Number(form.fromSalary) : undefined,
      toSalary: form.toSalary ? Number(form.toSalary) : undefined,
      reason: form.reason || undefined,
      notes: form.notes || undefined,
      approvedBy: form.approvedBy || undefined,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    if (!prefilledEmployeeId) setEmployeeDbId("");
    setManagerDbId("");
    setForm({ type: "", effectiveDate: "", fromPosition: "", toPosition: "", fromDepartment: "", toDepartment: "", fromSalary: "", toSalary: "", reason: "", notes: "", approvedBy: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Career Event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {!prefilledEmployeeId && (
            <div>
              <label className="text-sm font-medium mb-1 block">Employee *</label>
              <EmployeeSearchInput
                onSelect={(e) => { setEmployeeDbId(e.id); setError(""); }}
                onClear={() => setEmployeeDbId("")}
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Event Type *</label>
            <NativeSelect className="w-full" value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="">Select type…</option>
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </NativeSelect>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Effective Date *</label>
            <Input type="date" value={form.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} />
          </div>

          {showPosition && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">From Position</label>
                <Input placeholder="Current title" value={form.fromPosition} onChange={(e) => set("fromPosition", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">To Position</label>
                <Input placeholder="New title" value={form.toPosition} onChange={(e) => set("toPosition", e.target.value)} />
              </div>
            </div>
          )}

          {showDepartment && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">From Department</label>
                <Input placeholder="Current dept." value={form.fromDepartment} onChange={(e) => set("fromDepartment", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">To Department</label>
                <Input placeholder="New dept." value={form.toDepartment} onChange={(e) => set("toDepartment", e.target.value)} />
              </div>
            </div>
          )}

          {showManager && (
            <div>
              <label className="text-sm font-medium mb-1 block">New Reporting Manager</label>
              <EmployeeSearchInput
                onSelect={(e) => { setManagerDbId(e.id); }}
                onClear={() => setManagerDbId("")}
                placeholder="Search new manager by EMP-ID or name…"
              />
            </div>
          )}

          {showSalary && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">From Salary (AED)</label>
                <Input type="number" placeholder="0.00" value={form.fromSalary} onChange={(e) => set("fromSalary", e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">To Salary (AED)</label>
                <Input type="number" placeholder="0.00" value={form.toSalary} onChange={(e) => set("toSalary", e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-1 block">Reason</label>
            <Input value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Reason for this change…" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Approved By</label>
            <Input value={form.approvedBy} onChange={(e) => set("approvedBy", e.target.value)} placeholder="Name of approving authority" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any additional notes…" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>{isMutating ? "Saving…" : "Save Event"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

