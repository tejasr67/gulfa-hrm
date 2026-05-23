"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EmployeeSearchInput } from "@/components/shared/EmployeeSearchInput";
import { useAssignBenefit } from "@/modules/benefits/hooks";
import type { BenefitTypeItem } from "@/modules/benefits/hooks";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  types: BenefitTypeItem[];
};

export function AssignBenefitDialog({ open, onClose, onSuccess, types }: Props) {
  const { trigger, isMutating } = useAssignBenefit();
  const [employeeDbId, setEmployeeDbId] = useState("");
  const [form, setForm] = useState({
    benefitTypeId: "",
    value: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    notes: "",
  });
  const [error, setError] = useState("");

  function set(key: string, v: string) { setForm((p) => ({ ...p, [key]: v })); }

  async function handleSubmit() {
    setError("");
    if (!employeeDbId) { setError("Please select an employee"); return; }
    const res = await trigger({
      employeeId: employeeDbId,
      benefitTypeId: form.benefitTypeId,
      value: form.value ? Number(form.value) : undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      notes: form.notes || undefined,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setEmployeeDbId("");
    setForm({ benefitTypeId: "", value: "", startDate: new Date().toISOString().split("T")[0], endDate: "", notes: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Assign Benefit</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Employee *</label>
            <EmployeeSearchInput onSelect={(e) => { setEmployeeDbId(e.id); setError(""); }} onClear={() => setEmployeeDbId("")} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Benefit Type *</label>
            <NativeSelect className="w-full" value={form.benefitTypeId} onChange={(e) => set("benefitTypeId", e.target.value)}>
              <option value="">Select type…</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </NativeSelect>
            {types.length === 0 && <p className="text-xs text-muted-foreground mt-1">No benefit types configured yet.</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Monthly Value (AED, optional)</label>
            <Input type="number" min="0" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder="e.g. 500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date *</label>
              <Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>{isMutating ? "Assigning…" : "Assign"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

