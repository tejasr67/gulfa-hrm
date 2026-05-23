"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateRoom } from "@/modules/accommodation/hooks";

type Props = { accommodationId: string; accommodationName: string; open: boolean; onClose: () => void; onSuccess: () => void };

export function AddRoomDialog({ accommodationId, accommodationName, open, onClose, onSuccess }: Props) {
  const { trigger, isMutating } = useCreateRoom();
  const [form, setForm] = useState({ roomNumber: "", floor: "", capacity: "1" });
  const [error, setError] = useState("");

  function set(key: string, v: string) { setForm((p) => ({ ...p, [key]: v })); }

  async function handleSubmit() {
    setError("");
    if (!form.roomNumber.trim()) { setError("Room number is required"); return; }
    const res = await trigger({
      accommodationId,
      roomNumber: form.roomNumber.trim(),
      floor: form.floor || undefined,
      capacity: form.capacity ? Number(form.capacity) : 1,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setForm({ roomNumber: "", floor: "", capacity: "1" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{accommodationName}</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Room Number *</label>
            <Input value={form.roomNumber} onChange={(e) => set("roomNumber", e.target.value)} placeholder="e.g. 101" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Floor</label>
              <Input value={form.floor} onChange={(e) => set("floor", e.target.value)} placeholder="e.g. 1" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Capacity</label>
              <Input type="number" min="1" value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>{isMutating ? "Adding…" : "Add Room"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
