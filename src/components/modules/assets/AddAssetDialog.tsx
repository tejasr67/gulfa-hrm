"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useCreateAsset, useAssetCategories } from "@/modules/assets/hooks";

type Props = { open: boolean; onClose: () => void; onSuccess: () => void };

export function AddAssetDialog({ open, onClose, onSuccess }: Props) {
  const { trigger, isMutating } = useCreateAsset();
  const { data: categories = [], refetch: reloadCategories } = useAssetCategories();
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [catError, setCatError] = useState("");
  const [form, setForm] = useState({
    categoryId: "",
    name: "",
    code: "",
    serialNumber: "",
    brand: "",
    model: "",
    purchaseDate: "",
    purchasePrice: "",
    depreciationRate: "",
    warrantyExpiry: "",
    replacementCycleMonths: "",
    location: "",
    condition: "GOOD",
    notes: "",
  });
  const [error, setError] = useState("");

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleCreateCategory() {
    setCatError("");
    const name = newCategoryName.trim();
    if (!name) { setCatError("Name required"); return; }
    const res = await fetch("/api/assets/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (!json.success) { setCatError(json.error ?? "Failed"); return; }
    await reloadCategories();
    set("categoryId", json.data.id);
    setNewCategoryName("");
    setAddingCategory(false);
  }

  async function handleSubmit() {
    setError("");
    const res = await trigger({
      categoryId: form.categoryId,
      name: form.name,
      code: form.code,
      serialNumber: form.serialNumber || undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      purchaseDate: form.purchaseDate || undefined,
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
      depreciationRate: form.depreciationRate ? Number(form.depreciationRate) : undefined,
      warrantyExpiry: form.warrantyExpiry || undefined,
      replacementCycleMonths: form.replacementCycleMonths ? Number(form.replacementCycleMonths) : undefined,
      location: form.location || undefined,
      condition: form.condition,
      notes: form.notes || undefined,
    });
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
  }

  const field = (label: string, key: string, props?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      <Input {...props} value={form[key as keyof typeof form]} onChange={(e) => set(key, e.target.value)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Asset</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-sm font-medium mb-1 block">Category *</label>
            {!addingCategory ? (
              <div className="flex gap-2">
                <NativeSelect
                  className="flex-1"
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </NativeSelect>
                <Button type="button" variant="outline" size="sm" onClick={() => setAddingCategory(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />New
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="New category name…"
                  value={newCategoryName}
                  onChange={(e) => { setNewCategoryName(e.target.value); setCatError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreateCategory(); } if (e.key === "Escape") { setAddingCategory(false); setNewCategoryName(""); } }}
                  className={catError ? "border-destructive" : ""}
                />
                <Button type="button" size="sm" onClick={handleCreateCategory}>Add</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setAddingCategory(false); setNewCategoryName(""); setCatError(""); }}>Cancel</Button>
              </div>
            )}
            {catError && <p className="text-xs text-destructive mt-1">{catError}</p>}
          </div>
          {field("Asset Name *", "name", { placeholder: "e.g. MacBook Pro 14" })}
          {field("Asset Code *", "code", { placeholder: "e.g. LAP-001" })}
          {field("Serial Number", "serialNumber")}
          {field("Brand", "brand", { placeholder: "e.g. Apple" })}
          {field("Model", "model", { placeholder: "e.g. A2442" })}
          {field("Purchase Date", "purchaseDate", { type: "date" })}
          {field("Purchase Price (AED)", "purchasePrice", { type: "number", min: "0" })}
          {field("Depreciation Rate (% / yr)", "depreciationRate", { type: "number", min: "0", max: "100" })}
          {field("Warranty Expiry", "warrantyExpiry", { type: "date" })}
          {field("Replacement Cycle (months)", "replacementCycleMonths", { type: "number", min: "1" })}
          {field("Location", "location", { placeholder: "e.g. Dubai Office" })}
          <div>
            <label className="text-sm font-medium mb-1 block">Condition</label>
            <NativeSelect className="w-full" value={form.condition} onChange={(e) => set("condition", e.target.value)}>
              {["EXCELLENT", "GOOD", "FAIR", "POOR", "DAMAGED"].map((c) => <option key={c} value={c}>{c}</option>)}
            </NativeSelect>
          </div>
          <div className="col-span-2">{field("Notes", "notes", { placeholder: "Optional notes…" })}</div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isMutating}>
            {isMutating ? "Adding…" : "Add Asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

