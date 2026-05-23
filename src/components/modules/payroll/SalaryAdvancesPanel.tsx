"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EmployeeSearchInput } from "@/components/shared/EmployeeSearchInput";
import {
  useSalaryAdvances,
  useSalaryAdvanceMutation,
  type SalaryAdvanceItem,
} from "@/modules/payroll/hooks";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-blue-100 text-blue-800",
  REJECTED: "bg-red-100 text-red-800",
  DEDUCTED: "bg-green-100 text-green-800",
};

function fmtAED(n: number) {
  return new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED", maximumFractionDigits: 0 }).format(n);
}

type Advance = SalaryAdvanceItem;

export function SalaryAdvancesPanel() {
  const { data: advances = [], isLoading, refetch } = useSalaryAdvances();
  const { trigger } = useSalaryAdvanceMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [employeeDbId, setEmployeeDbId] = useState("");
  const [form, setForm] = useState({
    amount: "",
    reason: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [formError, setFormError] = useState("");

  async function handleCreate() {
    setFormError("");
    if (!employeeDbId || !form.amount) {
      setFormError("Employee and amount are required");
      return;
    }
    const res = await trigger({
      employeeId: employeeDbId,
      amount: Number(form.amount),
      reason: form.reason || undefined,
      month: form.month,
      year: form.year,
    });
    if (!res?.success) { setFormError(res?.error ?? "Failed"); return; }
    refetch();
    setShowCreate(false);
    setEmployeeDbId("");
    setForm({ amount: "", reason: "", month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    await trigger({ action, id });
    refetch();
  }

  if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h2 className="font-semibold">Salary Advances</h2>
          <p className="text-sm text-muted-foreground">Advance requests deducted in the chosen payroll month</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Advance
        </Button>
      </div>

      {advances.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">No advances yet.</div>
      ) : (
        <div className="divide-y">
          {advances.map((adv: Advance) => (
            <div key={adv.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium">{adv.employee.firstName} {adv.employee.lastName}</p>
                <p className="text-sm text-muted-foreground">
                  {adv.employee.employeeId} · {MONTH_NAMES[adv.month]} {adv.year}
                  {adv.reason ? ` · ${adv.reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{fmtAED(adv.amount)}</span>
                <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STATUS_STYLES[adv.status] ?? "bg-gray-100 text-gray-700"}`}>
                  {adv.status}
                </span>
                {adv.status === "PENDING" && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleAction(adv.id, "approve")}>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleAction(adv.id, "reject")}>
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Salary Advance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Employee *</label>
              <EmployeeSearchInput onSelect={(e) => { setEmployeeDbId(e.id); setFormError(""); }} onClear={() => setEmployeeDbId("")} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Amount (AED)</label>
              <Input type="number" min={0} value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Month</label>
                <NativeSelect className="w-full" value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: Number(e.target.value) }))}>
                  {MONTH_NAMES.slice(1).map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                </NativeSelect>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Year</label>
                <Input type="number" min={2020} value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Reason (optional)</label>
              <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

