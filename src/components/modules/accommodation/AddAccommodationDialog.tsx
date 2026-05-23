"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useCreateAccommodation } from "@/modules/accommodation/hooks";

const TYPES = ["APARTMENT", "VILLA", "LABOR_CAMP", "HOTEL"] as const;
const TYPE_LABELS: Record<string, string> = {
  APARTMENT: "Apartment",
  VILLA: "Villa",
  LABOR_CAMP: "Labour Camp",
  HOTEL: "Hotel",
};

type Props = { open: boolean; onClose: () => void; onSuccess: () => void };

export function AddAccommodationDialog({ open, onClose, onSuccess }: Props) {
  const { trigger, isMutating } = useCreateAccommodation();
  const [form, setForm] = useState({ name: "", address: "", city: "", capacity: "", type: "APARTMENT" });
  const [error, setError] = useState("");

  function set(key: string, value: string) { setForm((p) => ({ ...p, [key]: value })); }

  async function handleSubmit() {
    setError("");
    if (!form.name.trim() || !form.address.trim()) { setError("Name and address are required"); return; }
    if (!form.capacity || Number(form.capacity) < 1) { setError("Capacity must be at least 1"); return; }
    const res = await trigger({
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city || undefined,
      capacity: Number(form.capacity),
      type: form.type,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setForm({ name: "", address: "", city: "", capacity: "", type: "APARTMENT" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Property</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Property Name *</label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Al Quoz Labour Camp" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Type *</label>
            <NativeSelect className="w-full" value={form.type} onChange={(e) => set("type", e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </NativeSelect>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Address *</label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">City</label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Dubai" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Total Capacity *</label>
              <Input type="number" min="1" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} placeholder="e.g. 50" />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>{isMutating ? "Adding…" : "Add Property"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

