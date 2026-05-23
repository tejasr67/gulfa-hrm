"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreatePayrollRun } from "@/modules/payroll/hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Props = { open: boolean; onClose: () => void };

export function CreatePayrollRunDialog({ open, onClose }: Props) {
  const router = useRouter();
  const { trigger, isMutating } = useCreatePayrollRun();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    const res = await trigger({ month, year, notes: notes || undefined });
    if (!res?.success) {
      setError(res?.error ?? "Failed to create payroll run");
      return;
    }
    router.push(`/payroll/runs/${(res.data as { id: string }).id}`);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Payroll Run</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Month</label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {MONTH_NAMES.slice(1).map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Year</label>
              <Input
                type="number"
                min={2020}
                max={2100}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
            <Input
              placeholder="e.g. April 2026 regular payroll"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>
            {isMutating ? "Creating…" : "Create Run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
