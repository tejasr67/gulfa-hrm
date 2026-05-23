"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccommodationAssignmentMutation } from "@/modules/accommodation/hooks";

type Props = {
  assignmentId: string;
  employeeName: string;
  roomNumber: string;
  accommodationName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function VacateDialog({ assignmentId, employeeName, roomNumber, accommodationName, open, onClose, onSuccess }: Props) {
  const { trigger, isMutating } = useAccommodationAssignmentMutation();
  const today = new Date().toISOString().split("T")[0];
  const [vacatedAt, setVacatedAt] = useState(today);
  const [vacateNotes, setVacateNotes] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    const res = await trigger({ action: "vacate", assignmentId, vacatedAt, vacateNotes: vacateNotes || undefined });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setVacatedAt(today);
    setVacateNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Vacate Room</DialogTitle></DialogHeader>
        <div className="text-sm text-muted-foreground -mt-2">
          <p><span className="font-medium text-foreground">{employeeName}</span> · {accommodationName}, Room {roomNumber}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Vacate Date</label>
            <Input type="date" value={vacatedAt} onChange={(e) => setVacatedAt(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Reason / Notes</label>
            <Input value={vacateNotes} onChange={(e) => setVacateNotes(e.target.value)} placeholder="e.g. Transferred, resigned…" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isMutating}>{isMutating ? "Processing…" : "Vacate"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
