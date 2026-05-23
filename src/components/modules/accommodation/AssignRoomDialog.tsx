"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccommodationAssignmentMutation, useUnassignedEmployees } from "@/modules/accommodation/hooks";
import type { UnassignedEmployee } from "@/modules/accommodation/hooks";

type Props = {
  roomId: string;
  roomNumber: string;
  accommodationName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AssignRoomDialog({ roomId, roomNumber, accommodationName, open, onClose, onSuccess }: Props) {
  const { trigger, isMutating } = useAccommodationAssignmentMutation();
  const { data: unassigned } = useUnassignedEmployees();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<UnassignedEmployee | null>(null);
  const [monthlyRent, setMonthlyRent] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const filtered = unassigned.filter((e) => {
    const q = search.toLowerCase();
    return !q || `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) || e.employeeId.toLowerCase().includes(q) || e.department?.name.toLowerCase().includes(q);
  });

  async function handleSubmit() {
    setError("");
    if (!selected) { setError("Select an employee"); return; }
    const res = await trigger({
      action: "assign",
      employeeId: selected.id,
      roomId,
      monthlyRent: monthlyRent ? Number(monthlyRent) : undefined,
      notes: notes || undefined,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setSearch(""); setSelected(null); setMonthlyRent(""); setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Assign Room</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">{accommodationName} · Room {roomNumber}</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Employee *</label>
            {selected ? (
              <div className="flex items-center justify-between rounded-md border border-primary px-3 py-2 bg-primary/5">
                <div>
                  <p className="text-sm font-medium">{selected.firstName} {selected.lastName}</p>
                  <p className="text-xs text-muted-foreground">{selected.employeeId}{selected.department ? ` · ${selected.department.name}` : ""}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground">Change</button>
              </div>
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 text-sm"
                    placeholder="Search by name or ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-36 overflow-y-auto rounded-md border divide-y">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      {unassigned.length === 0 ? "All active employees have accommodation" : "No matches"}
                    </p>
                  ) : (
                    filtered.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => setSelected(e)}
                        className="w-full px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                      >
                        <p className="text-sm font-medium">{e.firstName} {e.lastName}</p>
                        <p className="text-xs text-muted-foreground">{e.employeeId}{e.department ? ` · ${e.department.name}` : ""}{e.nationality ? ` · ${e.nationality}` : ""}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Monthly Rent (AED)</label>
              <Input type="number" min="0" placeholder="0" value={monthlyRent} onChange={(e) => setMonthlyRent(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes…" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating || !selected}>{isMutating ? "Assigning…" : "Assign"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
