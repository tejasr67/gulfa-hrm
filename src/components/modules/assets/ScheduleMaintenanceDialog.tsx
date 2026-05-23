"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMaintenanceMutation } from "@/modules/assets/hooks";

const MAINTENANCE_TYPES = [
  "ROUTINE", "REPAIR", "INSPECTION", "REPLACEMENT", "CALIBRATION",
];

type Props = {
  assetId: string;
  assetName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function ScheduleMaintenanceDialog({ assetId, assetName, open, onClose, onSuccess }: Props) {
  const { trigger, isMutating } = useMaintenanceMutation();
  const [form, setForm] = useState({
    type: "ROUTINE",
    scheduledAt: "",
    description: "",
    vendor: "",
    cost: "",
  });
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit() {
    setError("");
    if (!form.scheduledAt) { setError("Scheduled date is required"); return; }
    const res = await trigger({
      action: "schedule",
      assetId,
      type: form.type,
      scheduledAt: form.scheduledAt,
      description: form.description || undefined,
      vendor: form.vendor || undefined,
      cost: form.cost ? Number(form.cost) : undefined,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setForm({ type: "ROUTINE", scheduledAt: "", description: "", vendor: "", cost: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Schedule Maintenance</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{assetName}</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Type</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Scheduled Date *</label>
            <Input type="date" value={form.scheduledAt} onChange={(e) => set("scheduledAt", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description (optional)</label>
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What needs to be done…" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Vendor (optional)</label>
            <Input value={form.vendor} onChange={(e) => set("vendor", e.target.value)} placeholder="Service provider…" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Estimated Cost (AED, optional)</label>
            <Input type="number" min="0" value={form.cost} onChange={(e) => set("cost", e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>
            {isMutating ? "Scheduling…" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
