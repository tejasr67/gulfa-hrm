"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Edit2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEmployeeSalaries, useUpsertEmployeeSalary, type EmployeeSalaryItem } from "@/modules/payroll/hooks";

function fmtAED(n: number) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(n);
}

type Salary = EmployeeSalaryItem;

type EditState = {
  employeeId: string;
  name: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  mobileAllowance: number;
  otherAllowances: number;
  currency: string;
  effectiveFrom: string;
};

export function SalaryStructureTable() {
  const { data: salaries = [], isLoading, refetch } = useEmployeeSalaries();
  const { trigger } = useUpsertEmployeeSalary();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [saveError, setSaveError] = useState("");

  function openEdit(s: Salary) {
    setEditing({
      employeeId: s.employee.id,
      name: `${s.employee.firstName} ${s.employee.lastName}`,
      basicSalary: s.basicSalary,
      housingAllowance: s.housingAllowance,
      transportAllowance: s.transportAllowance,
      foodAllowance: s.foodAllowance,
      mobileAllowance: s.mobileAllowance,
      otherAllowances: s.otherAllowances,
      currency: s.currency,
      effectiveFrom: format(new Date(s.effectiveFrom), "yyyy-MM-dd"),
    });
  }

  async function handleSave() {
    if (!editing) return;
    setSaveError("");
    const res = await trigger({
      employeeId: editing.employeeId,
      basicSalary: editing.basicSalary,
      housingAllowance: editing.housingAllowance,
      transportAllowance: editing.transportAllowance,
      foodAllowance: editing.foodAllowance,
      mobileAllowance: editing.mobileAllowance,
      otherAllowances: editing.otherAllowances,
      currency: editing.currency,
      effectiveFrom: editing.effectiveFrom,
    });
    if (!res?.success) {
      setSaveError(res?.error ?? "Failed to save");
      return;
    }
    refetch();
    setEditing(null);
  }

  if (isLoading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;

  if (salaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Users className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="font-medium">No salary records</p>
        <p className="text-sm text-muted-foreground mt-1">
          Add salaries for employees to enable payroll generation.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Employee</th>
              <th className="text-right px-4 py-3 font-medium">Basic</th>
              <th className="text-right px-4 py-3 font-medium">Housing</th>
              <th className="text-right px-4 py-3 font-medium">Transport</th>
              <th className="text-right px-4 py-3 font-medium">Other</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <th className="text-center px-4 py-3 font-medium">Effective</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {salaries.map((s: Salary) => (
              <tr key={s.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="font-medium">{s.employee.firstName} {s.employee.lastName}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.employee.employeeId} · {s.employee.position?.title ?? ""}
                  </p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtAED(s.basicSalary)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtAED(s.housingAllowance)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtAED(s.transportAllowance)}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {fmtAED(s.foodAllowance + s.mobileAllowance + s.otherAllowances)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmtAED(s.totalSalary)}</td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {format(new Date(s.effectiveFrom), "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Salary — {editing.name}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Basic Salary", key: "basicSalary" },
                { label: "Housing Allowance", key: "housingAllowance" },
                { label: "Transport Allowance", key: "transportAllowance" },
                { label: "Food Allowance", key: "foodAllowance" },
                { label: "Mobile Allowance", key: "mobileAllowance" },
                { label: "Other Allowances", key: "otherAllowances" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="text-sm font-medium mb-1 block">{label}</label>
                  <Input
                    type="number"
                    min={0}
                    value={editing[key as keyof EditState] as number}
                    onChange={(e) =>
                      setEditing((prev) => prev ? { ...prev, [key]: Number(e.target.value) } : null)
                    }
                  />
                </div>
              ))}
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1 block">Effective From</label>
                <Input
                  type="date"
                  value={editing.effectiveFrom}
                  onChange={(e) => setEditing((prev) => prev ? { ...prev, effectiveFrom: e.target.value } : null)}
                />
              </div>
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
