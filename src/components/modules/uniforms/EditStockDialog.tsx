"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateStock, type StockItem } from "@/modules/uniforms/hooks";

const CATEGORY_LABELS: Record<string, string> = {
  TSHIRT: "T-Shirts", PANTS: "Pants", SHOES: "Safety Shoes", CAPS: "Caps", OTHER: "Other",
};

type Props = { item: StockItem | null; onClose: () => void; onSuccess: () => void };

export function EditStockDialog({ item, onClose, onSuccess }: Props) {
  const { updateQty, isMutating } = useUpdateStock();
  const [qty, setQty] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) { setQty(String(item.qty)); setError(""); }
  }, [item]);

  async function handleSave() {
    setError("");
    const n = Number(qty);
    if (isNaN(n) || n < 0) { setError("Quantity must be a non-negative number"); return; }
    const res = await updateQty(item!.id, n);
    if (!res?.success) { setError(res?.error ?? "Failed"); return; }
    onSuccess();
    onClose();
  }

  if (!item) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit Stock Quantity</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm space-y-1">
            <p><span className="text-muted-foreground">Category:</span> {CATEGORY_LABELS[item.category] ?? item.category}</p>
            <p><span className="text-muted-foreground">Size:</span> {item.size}{item.color ? ` · ${item.color}` : ""}</p>
            <p><span className="text-muted-foreground">Location:</span> {item.location}</p>
            <p><span className="text-muted-foreground">Current qty:</span> <span className="font-semibold">{item.qty}</span></p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">New Quantity</label>
            <Input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isMutating}>{isMutating ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
