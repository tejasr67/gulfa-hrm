"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateDocument } from "@/modules/documents/hooks";
import type { DocumentTypeItem } from "@/modules/documents/hooks";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  types: DocumentTypeItem[];
  prefilledEmployeeId?: string;
};

export function AddDocumentDialog({ open, onClose, onSuccess, types, prefilledEmployeeId }: Props) {
  const { trigger, isMutating } = useCreateDocument();
  const [form, setForm] = useState({
    employeeId: prefilledEmployeeId ?? "",
    documentTypeId: "",
    documentNumber: "",
    issueDate: "",
    expiryDate: "",
    issuedBy: "",
    notes: "",
  });
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit() {
    setError("");
    const res = await trigger({
      employeeId: form.employeeId,
      documentTypeId: form.documentTypeId,
      documentNumber: form.documentNumber || undefined,
      issueDate: form.issueDate || undefined,
      expiryDate: form.expiryDate || undefined,
      issuedBy: form.issuedBy || undefined,
      notes: form.notes || undefined,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setForm({ employeeId: prefilledEmployeeId ?? "", documentTypeId: "", documentNumber: "", issueDate: "", expiryDate: "", issuedBy: "", notes: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Document</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!prefilledEmployeeId && (
            <div>
              <label className="text-sm font-medium mb-1 block">Employee ID *</label>
              <Input
                placeholder="emp_…"
                value={form.employeeId}
                onChange={(e) => set("employeeId", e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Document Type *</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.documentTypeId}
              onChange={(e) => set("documentTypeId", e.target.value)}
            >
              <option value="">Select type…</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Document Number</label>
              <Input value={form.documentNumber} onChange={(e) => set("documentNumber", e.target.value)} placeholder="e.g. A12345678" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Issued By</label>
              <Input value={form.issuedBy} onChange={(e) => set("issuedBy", e.target.value)} placeholder="Issuing authority" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Issue Date</label>
              <Input type="date" value={form.issueDate} onChange={(e) => set("issueDate", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Expiry Date</label>
              <Input type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional notes…" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>
            {isMutating ? "Adding…" : "Add Document"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
