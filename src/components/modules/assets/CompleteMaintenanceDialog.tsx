"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMaintenanceMutation } from "@/modules/assets/hooks";

type Props = {
  maintenanceId: string;
  assetName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function CompleteMaintenanceDialog({ maintenanceId, assetName, open, onClose, onSuccess }: Props) {
  const { trigger, isMutating } = useMaintenanceMutation();
  const [form, setForm] = useState({
    completedAt: new Date().toISOString().split("T")[0],
    outcome: "",
    cost: "",
    newCondition: "GOOD",
    nextMaintenanceAt: "",
  });
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit() {
    setError("");
    if (!form.completedAt) { setError("Completed date is required"); return; }
    const res = await trigger({
      action: "complete",
      maintenanceId,
      completedAt: form.completedAt,
      outcome: form.outcome || undefined,
      cost: form.cost ? Number(form.cost) : undefined,
      newCondition: form.newCondition,
      nextMaintenanceAt: form.nextMaintenanceAt || undefined,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Complete Maintenance</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{assetName}</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Completed Date *</label>
            <Input type="date" value={form.completedAt} onChange={(e) => set("completedAt", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Asset Condition After</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.newCondition}
              onChange={(e) => set("newCondition", e.target.value)}
            >
              {["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Outcome / Notes (optional)</label>
            <Input value={form.outcome} onChange={(e) => set("outcome", e.target.value)} placeholder="What was done, findings…" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Actual Cost (AED, optional)</label>
            <Input type="number" min="0" value={form.cost} onChange={(e) => set("cost", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Next Maintenance Date (optional)</label>
            <Input type="date" value={form.nextMaintenanceAt} onChange={(e) => set("nextMaintenanceAt", e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>
            {isMutating ? "Completing…" : "Mark Complete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
