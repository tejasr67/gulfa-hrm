"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { EmployeeSearchInput } from "@/components/shared/EmployeeSearchInput";
import { useIssuanceMutation, type StockItem } from "@/modules/uniforms/hooks";

const CATEGORY_LABELS: Record<string, string> = {
  TSHIRT: "T-Shirts", PANTS: "Pants", SHOES: "Safety Shoes", CAPS: "Caps", OTHER: "Other",
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stock: StockItem[];
};

export function IssueUniformDialog({ open, onClose, onSuccess, stock }: Props) {
  const { trigger, isMutating } = useIssuanceMutation();
  const [employeeDbId, setEmployeeDbId] = useState("");
  const [form, setForm] = useState({ category: "", location: "", size: "", color: "", qty: "1", notes: "" });
  const [error, setError] = useState("");

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  const categories = useMemo(() => [...new Set(stock.map((s) => s.category))].sort(), [stock]);
  const locations = useMemo(() => {
    if (!form.category) return [...new Set(stock.map((s) => s.location))].sort();
    return [...new Set(stock.filter((s) => s.category === form.category).map((s) => s.location))].sort();
  }, [stock, form.category]);
  const sizes = useMemo(() => {
    return [...new Set(stock.filter((s) => s.category === form.category && (!form.location || s.location === form.location)).map((s) => s.size))].sort();
  }, [stock, form.category, form.location]);
  const colors = useMemo(() => {
    const cs = [...new Set(stock.filter((s) => s.category === form.category && s.size === form.size && (!form.location || s.location === form.location) && s.color).map((s) => s.color))];
    return cs.filter(Boolean).sort();
  }, [stock, form.category, form.size, form.location]);

  const selectedItem = useMemo(() => {
    return stock.find((s) => s.category === form.category && s.size === form.size && s.color === (form.color || "") && s.location === form.location) ?? null;
  }, [stock, form]);

  async function handleSubmit() {
    setError("");
    if (!employeeDbId) { setError("Please select an employee"); return; }
    if (!form.category || !form.size || !form.location) { setError("Category, size, and location are required"); return; }
    if (!selectedItem) { setError("Stock item not found for selected combination"); return; }
    if (selectedItem.qty < Number(form.qty)) { setError(`Only ${selectedItem.qty} in stock`); return; }

    const res = await trigger({
      employeeId: employeeDbId,
      category: form.category,
      size: form.size,
      color: form.color,
      location: form.location,
      qty: Number(form.qty),
      notes: form.notes || undefined,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setEmployeeDbId("");
    setForm({ category: "", location: "", size: "", color: "", qty: "1", notes: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Issue Uniform</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Employee *</label>
            <EmployeeSearchInput onSelect={(e) => { setEmployeeDbId(e.id); setError(""); }} onClear={() => setEmployeeDbId("")} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Category *</label>
            <NativeSelect className="w-full" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select…</option>
              {categories.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}
            </NativeSelect>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Location *</label>
            <NativeSelect className="w-full" value={form.location} onChange={(e) => set("location", e.target.value)}>
              <option value="">Select…</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </NativeSelect>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Size *</label>
            <NativeSelect className="w-full" value={form.size} onChange={(e) => set("size", e.target.value)}>
              <option value="">Select…</option>
              {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </NativeSelect>
          </div>
          {colors.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-1 block">Color</label>
              <NativeSelect className="w-full" value={form.color} onChange={(e) => set("color", e.target.value)}>
                <option value="">Any</option>
                {colors.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </div>
          )}
          {selectedItem && (
            <p className="text-xs text-muted-foreground">
              Available in stock: <span className="font-semibold text-foreground">{selectedItem.qty}</span>
            </p>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Quantity</label>
            <Input type="number" min={1} value={form.qty} onChange={(e) => set("qty", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any notes…" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>{isMutating ? "Issuing…" : "Issue"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

