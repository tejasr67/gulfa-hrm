"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EmployeeSearchInput } from "@/components/shared/EmployeeSearchInput";
import { useCreateDisciplinaryRecord } from "@/modules/disciplinary/hooks";
import type { DisciplinaryTypeItem } from "@/modules/disciplinary/hooks";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  types: DisciplinaryTypeItem[];
};

export function AddDisciplinaryDialog({ open, onClose, onSuccess, types }: Props) {
  const { trigger, isMutating } = useCreateDisciplinaryRecord();
  const [employeeDbId, setEmployeeDbId] = useState("");
  const [form, setForm] = useState({
    typeId: "",
    incidentDate: "",
    description: "",
    action: "",
    actionDate: "",
  });
  const [error, setError] = useState("");

  function set(key: string, v: string) { setForm((p) => ({ ...p, [key]: v })); }

  async function handleSubmit() {
    setError("");
    if (!employeeDbId) { setError("Please select an employee"); return; }
    const res = await trigger({
      employeeId: employeeDbId,
      typeId: form.typeId,
      incidentDate: form.incidentDate,
      description: form.description,
      action: form.action,
      actionDate: form.actionDate || undefined,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setEmployeeDbId("");
    setForm({ typeId: "", incidentDate: "", description: "", action: "", actionDate: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Disciplinary Record</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Employee *</label>
            <EmployeeSearchInput onSelect={(e) => { setEmployeeDbId(e.id); setError(""); }} onClear={() => setEmployeeDbId("")} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Type *</label>
            <NativeSelect className="w-full" value={form.typeId} onChange={(e) => set("typeId", e.target.value)}>
              <option value="">Select type…</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.severity})</option>)}
            </NativeSelect>
            {types.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No disciplinary types configured. Create types via the API or settings.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Incident Date *</label>
              <Input type="date" value={form.incidentDate} onChange={(e) => set("incidentDate", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Action Date</label>
              <Input type="date" value={form.actionDate} onChange={(e) => set("actionDate", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description *</label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the incident…" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Action Taken *</label>
            <Input value={form.action} onChange={(e) => set("action", e.target.value)} placeholder="e.g. Verbal warning issued…" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>{isMutating ? "Adding…" : "Add Record"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

