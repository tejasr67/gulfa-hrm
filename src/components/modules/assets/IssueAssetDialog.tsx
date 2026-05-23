"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmployeeSearchInput } from "@/components/shared/EmployeeSearchInput";
import { useAssetAssignmentMutation } from "@/modules/assets/hooks";

type Props = {
  assetId: string;
  assetName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function IssueAssetDialog({ assetId, assetName, open, onClose, onSuccess }: Props) {
  const { trigger, isMutating } = useAssetAssignmentMutation();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function reset() {
    setSelectedEmployeeId(null);
    setExpectedReturnDate("");
    setCondition("GOOD");
    setNotes("");
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    setError("");
    if (!selectedEmployeeId) { setError("Please select an employee"); return; }
    const res = await trigger({
      assetId,
      employeeId: selectedEmployeeId,   // database id (cuid), not EMP-XXXX
      condition,
      expectedReturnDate: expectedReturnDate || undefined,
      notes: notes || undefined,
    });
    if (!res?.success) { setError(res?.error ?? "Failed to issue asset"); return; }
    onSuccess();
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Issue Asset</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">{assetName}</p>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Employee *</label>
            <EmployeeSearchInput
              onSelect={(emp) => { setSelectedEmployeeId(emp.id); setError(""); }}
              onClear={() => setSelectedEmployeeId(null)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Condition at Issue</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              {["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"].map((c) => (
                <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Expected Return Date <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
            <Input type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Notes <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes about this issue…" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating || !selectedEmployeeId}>
            {isMutating ? "Issuing…" : "Issue Asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
