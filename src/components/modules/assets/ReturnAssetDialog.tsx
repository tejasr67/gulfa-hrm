"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useAssetAssignmentMutation } from "@/modules/assets/hooks";

type Props = {
  assignmentId: string;
  assetName: string;
  employeeName: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function ReturnAssetDialog({ assignmentId, assetName, employeeName, open, onClose, onSuccess }: Props) {
  const { trigger, isMutating } = useAssetAssignmentMutation();
  const [returnCondition, setReturnCondition] = useState("GOOD");
  const [returnNotes, setReturnNotes] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    const res = await trigger({ action: "return", assignmentId, returnCondition, returnNotes: returnNotes || undefined });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setReturnCondition("GOOD");
    setReturnNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Return Asset</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-0.5">
          <p><span className="font-medium text-foreground">{assetName}</span></p>
          <p>Returning from: {employeeName}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Return Condition</label>
            <NativeSelect className="w-full" value={returnCondition} onChange={(e) => setReturnCondition(e.target.value)}>
              {["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"].map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
            <Input value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Any damage, issues…" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>
            {isMutating ? "Returning…" : "Confirm Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

