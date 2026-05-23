"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useUpdateStock } from "@/modules/uniforms/hooks";

const CATEGORIES = [
  { value: "TSHIRT", label: "T-Shirts" },
  { value: "PANTS", label: "Pants" },
  { value: "SHOES", label: "Safety Shoes" },
  { value: "CAPS", label: "Caps" },
  { value: "OTHER", label: "Other" },
];

const TSHIRT_COLORS = ["Red", "White", "Blue", "Grey", "Black", "Yellow", "Green", "Orange"];

type Props = { open: boolean; onClose: () => void; onSuccess: () => void; locations: string[] };

export function AddStockItemDialog({ open, onClose, onSuccess, locations }: Props) {
  const { addItem, isMutating } = useUpdateStock();
  const [form, setForm] = useState({ category: "TSHIRT", size: "", color: "", location: "", qty: "0", minStock: "5", newLocation: "" });
  const [error, setError] = useState("");
  const showColor = form.category === "TSHIRT";

  function set(k: string, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function handleSubmit() {
    setError("");
    const location = form.location === "__new__" ? form.newLocation.trim() : form.location;
    if (!form.size.trim()) { setError("Size is required"); return; }
    if (!location) { setError("Location is required"); return; }
    const res = await addItem({
      category: form.category,
      size: form.size.trim(),
      color: showColor ? form.color : "",
      location,
      qty: Number(form.qty),
      minStock: Number(form.minStock),
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
    setForm({ category: "TSHIRT", size: "", color: "", location: "", qty: "0", minStock: "5", newLocation: "" });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Add Stock SKU</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Category *</label>
            <NativeSelect className="w-full" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </NativeSelect>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Size *</label>
            <Input placeholder="e.g. M, XL, 32, 44" value={form.size} onChange={(e) => set("size", e.target.value)} />
          </div>
          {showColor && (
            <div>
              <label className="text-sm font-medium mb-1 block">Color</label>
              <NativeSelect className="w-full" value={form.color} onChange={(e) => set("color", e.target.value)}>
                <option value="">No color</option>
                {TSHIRT_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </NativeSelect>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1 block">Location *</label>
            <NativeSelect className="w-full" value={form.location} onChange={(e) => set("location", e.target.value)}>
              <option value="">Select…</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value="__new__">+ New location</option>
            </NativeSelect>
            {form.location === "__new__" && (
              <Input className="mt-2" placeholder="Location name" value={form.newLocation} onChange={(e) => set("newLocation", e.target.value)} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Qty</label>
              <Input type="number" min={0} value={form.qty} onChange={(e) => set("qty", e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Min Stock</label>
              <Input type="number" min={0} value={form.minStock} onChange={(e) => set("minStock", e.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>{isMutating ? "Adding…" : "Add SKU"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

