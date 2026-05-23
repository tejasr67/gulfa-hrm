"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Package, AlertTriangle, TrendingDown, BarChart3,
  Plus, FileSpreadsheet, RotateCcw, Search, Pencil, Trash2, ArrowDownToLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent } from "@/components/ui/card";
import { useUniformStock, useIssuances, useUpdateStock, useIssuanceMutation, type StockItem, type IssuanceItem } from "@/modules/uniforms/hooks";
import { IssueUniformDialog } from "@/components/modules/uniforms/IssueUniformDialog";
import { EditStockDialog } from "@/components/modules/uniforms/EditStockDialog";
import { AddStockItemDialog } from "@/components/modules/uniforms/AddStockItemDialog";
import { BulkUniformDialog } from "@/components/modules/uniforms/BulkUniformDialog";

const CATEGORY_LABELS: Record<string, string> = {
  TSHIRT: "T-Shirts",
  PANTS: "Pants",
  SHOES: "Safety Shoes",
  CAPS: "Caps",
  OTHER: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  TSHIRT: "bg-blue-50 text-blue-700",
  PANTS: "bg-purple-50 text-purple-700",
  SHOES: "bg-orange-50 text-orange-700",
  CAPS: "bg-green-50 text-green-700",
  OTHER: "bg-gray-50 text-gray-700",
};

const COLOR_SWATCHES: Record<string, string> = {
  Red: "bg-red-500",
  White: "bg-white border border-gray-200",
  Blue: "bg-blue-500",
  Grey: "bg-gray-400",
  Black: "bg-gray-900",
  Yellow: "bg-yellow-400",
  Green: "bg-green-500",
  Orange: "bg-orange-500",
};

export function UniformClient() {
  const [tab, setTab] = useState<"stock" | "issuances" | "report">("stock");
  const [showIssue, setShowIssue] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterLoc, setFilterLoc] = useState("");

  const { stock, stats, isLoading, refetch } = useUniformStock();
  const { data: issuances, isLoading: issuLoading, refetch: refetchIss } = useIssuances();
  const { deleteItem, isMutating } = useUpdateStock();
  const { trigger: returnTrigger } = useIssuanceMutation();

  const locations = useMemo(() => [...new Set(stock.map((s) => s.location))].sort(), [stock]);

  const filteredStock = useMemo(() => {
    const q = search.toLowerCase();
    return stock.filter((s) => {
      if (filterCat && s.category !== filterCat) return false;
      if (filterLoc && s.location !== filterLoc) return false;
      if (q && !s.size.toLowerCase().includes(q) && !s.color.toLowerCase().includes(q) && !CATEGORY_LABELS[s.category]?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [stock, search, filterCat, filterLoc]);

  const groupedStock = useMemo(() => {
    const groups: Record<string, Record<string, StockItem[]>> = {};
    for (const item of filteredStock) {
      if (!groups[item.category]) groups[item.category] = {};
      if (!groups[item.category][item.location]) groups[item.category][item.location] = [];
      groups[item.category][item.location].push(item);
    }
    return groups;
  }, [filteredStock]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this stock item?")) return;
    await deleteItem(id);
    refetch();
  }

  async function handleReturn(id: string) {
    await returnTrigger({ action: "return", id });
    refetchIss();
    refetch();
  }

  const STAT_CARDS = [
    { label: "Total Items", value: stats.totalItems, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "SKUs", value: stats.skuCount, icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Low Stock", value: stats.lowStock, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Out of Stock", value: stats.outOfStock, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${s.bg} shrink-0`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab bar + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["stock", "issuances", "report"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t === "stock" ? "Stock" : t === "issuances" ? "Issuances" : "Report"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowBulk(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Bulk Update
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add SKU
          </Button>
          <Button size="sm" onClick={() => setShowIssue(true)}>
            <ArrowDownToLine className="h-4 w-4 mr-1" />
            Issue Uniform
          </Button>
        </div>
      </div>

      {/* ── Stock tab ──────────────────────────────────────────────────────── */}
      {tab === "stock" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <NativeSelect value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
            <NativeSelect value={filterLoc} onChange={(e) => setFilterLoc(e.target.value)}>
              <option value="">All Locations</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </NativeSelect>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          ) : Object.keys(groupedStock).length === 0 ? (
            <div className="rounded-xl border py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground mb-3 mx-auto" />
              <p className="font-medium">No stock items found</p>
            </div>
          ) : (
            Object.entries(groupedStock).map(([cat, locMap]) => (
              <div key={cat} className="rounded-xl border overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b flex items-center gap-2">
                  <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-700"}`}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </span>
                </div>
                {Object.entries(locMap).map(([loc, items]) => (
                  <div key={loc}>
                    <div className="px-4 py-2 bg-muted/10 border-b text-xs font-medium text-muted-foreground">{loc}</div>
                    <table className="w-full text-sm">
                      <thead className="bg-muted/20">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium">Size</th>
                          {cat === "TSHIRT" && <th className="px-4 py-2 text-left font-medium">Color</th>}
                          <th className="px-4 py-2 text-left font-medium">Qty</th>
                          <th className="px-4 py-2 text-left font-medium">Min Stock</th>
                          <th className="px-4 py-2 text-left font-medium">Status</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {items.map((item) => {
                          const isLow = item.qty < item.minStock;
                          const isOut = item.qty === 0;
                          return (
                            <tr key={item.id} className={`hover:bg-muted/10 ${isOut ? "bg-red-50/30" : isLow ? "bg-amber-50/30" : ""}`}>
                              <td className="px-4 py-2.5 font-mono font-medium">{item.size}</td>
                              {cat === "TSHIRT" && (
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    {item.color && (
                                      <span className={`inline-block h-3 w-3 rounded-full ${COLOR_SWATCHES[item.color] ?? "bg-gray-300"}`} />
                                    )}
                                    <span>{item.color || "—"}</span>
                                  </div>
                                </td>
                              )}
                              <td className="px-4 py-2.5 font-semibold">{item.qty}</td>
                              <td className="px-4 py-2.5 text-muted-foreground">{item.minStock}</td>
                              <td className="px-4 py-2.5">
                                {isOut ? (
                                  <span className="inline-flex rounded-full bg-red-100 text-red-700 text-xs px-2 py-0.5 font-medium">Out of Stock</span>
                                ) : isLow ? (
                                  <span className="inline-flex rounded-full bg-amber-100 text-amber-700 text-xs px-2 py-0.5 font-medium">⚠ Reorder</span>
                                ) : (
                                  <span className="inline-flex rounded-full bg-green-100 text-green-700 text-xs px-2 py-0.5 font-medium">OK</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => setEditItem(item)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleDelete(item.id)} disabled={isMutating} className="p-1 text-muted-foreground hover:text-destructive rounded">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Issuances tab ──────────────────────────────────────────────────── */}
      {tab === "issuances" && (
        <IssuancesPanel issuances={issuances} isLoading={issuLoading} onReturn={handleReturn} />
      )}

      {/* ── Report tab ─────────────────────────────────────────────────────── */}
      {tab === "report" && (
        <ReportPanel stock={stock} />
      )}

      {/* Dialogs */}
      <IssueUniformDialog open={showIssue} onClose={() => setShowIssue(false)} onSuccess={() => { refetch(); refetchIss(); }} stock={stock} />
      <EditStockDialog item={editItem} onClose={() => setEditItem(null)} onSuccess={refetch} />
      <AddStockItemDialog open={showAdd} onClose={() => setShowAdd(false)} onSuccess={refetch} locations={locations} />
      <BulkUniformDialog open={showBulk} onClose={() => setShowBulk(false)} onSuccess={refetch} locations={locations} />
    </>
  );
}

// ── Issuances panel ───────────────────────────────────────────────────────────

function IssuancesPanel({ issuances, isLoading, onReturn }: { issuances: IssuanceItem[]; isLoading: boolean; onReturn: (id: string) => void }) {
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "returned">("active");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return issuances.filter((i) => {
      if (filterActive === "active" && i.returnedAt) return false;
      if (filterActive === "returned" && !i.returnedAt) return false;
      if (q) {
        const name = `${i.employee.firstName} ${i.employee.lastName}`.toLowerCase();
        if (!name.includes(q) && !i.employee.employeeId.toLowerCase().includes(q) && !i.size.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [issuances, search, filterActive]);

  if (isLoading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search employee…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["all", "active", "returned"] as const).map((f) => (
            <button key={f} onClick={() => setFilterActive(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterActive === f ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border py-12 text-center text-sm text-muted-foreground">No issuances found</div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Employee</th>
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Location</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Issued</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-muted/10">
                  <td className="px-4 py-3">
                    <p className="font-medium">{i.employee.firstName} {i.employee.lastName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{i.employee.employeeId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{CATEGORY_LABELS[i.category] ?? i.category}</p>
                    <p className="text-xs text-muted-foreground">{i.size}{i.color ? ` · ${i.color}` : ""} · Qty {i.qty}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs">{i.location}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    {format(new Date(i.issuedAt), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    {i.returnedAt ? (
                      <span className="inline-flex rounded-full bg-gray-100 text-gray-600 text-xs px-2 py-0.5 font-medium">
                        Returned {format(new Date(i.returnedAt), "dd MMM")}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-blue-100 text-blue-700 text-xs px-2 py-0.5 font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!i.returnedAt && (
                      <button onClick={() => onReturn(i.id)} className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-0.5 ml-auto">
                        <RotateCcw className="h-3 w-3" />
                        Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Report panel ──────────────────────────────────────────────────────────────

function ReportPanel({ stock }: { stock: StockItem[] }) {
  const byCategory = useMemo(() => {
    const map: Record<string, { total: number; low: number; out: number }> = {};
    for (const s of stock) {
      if (!map[s.category]) map[s.category] = { total: 0, low: 0, out: 0 };
      map[s.category].total += s.qty;
      if (s.qty === 0) map[s.category].out++;
      else if (s.qty < s.minStock) map[s.category].low++;
    }
    return map;
  }, [stock]);

  const byLocation = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of stock) {
      map[s.location] = (map[s.location] ?? 0) + s.qty;
    }
    return map;
  }, [stock]);

  const reorderItems = useMemo(() => stock.filter((s) => s.qty < s.minStock).sort((a, b) => a.qty - b.qty), [stock]);

  function downloadReport() {
    import("xlsx").then((XLSX) => {
      const wb = XLSX.utils.book_new();

      // Full stock sheet
      const ws1 = XLSX.utils.json_to_sheet(stock.map((s) => ({
        Category: CATEGORY_LABELS[s.category] ?? s.category,
        Size: s.size,
        Color: s.color || "—",
        Location: s.location,
        "Qty (Current)": s.qty,
        "Min Stock": s.minStock,
        Status: s.qty === 0 ? "OUT OF STOCK" : s.qty < s.minStock ? "REORDER" : "OK",
      })));
      XLSX.utils.book_append_sheet(wb, ws1, "All Stock");

      // Reorder sheet
      const ws2 = XLSX.utils.json_to_sheet(reorderItems.map((s) => ({
        Category: CATEGORY_LABELS[s.category] ?? s.category,
        Size: s.size,
        Color: s.color || "—",
        Location: s.location,
        "Qty (Current)": s.qty,
        "Min Stock": s.minStock,
        "Qty to Order": s.minStock - s.qty,
      })));
      XLSX.utils.book_append_sheet(wb, ws2, "Reorder List");

      XLSX.writeFile(wb, `uniform_report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={downloadReport}>
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          Export Report
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* By category */}
        <div className="rounded-xl border overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b font-medium text-sm">By Category</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Category</th>
                <th className="px-4 py-2 text-right font-medium">Total Qty</th>
                <th className="px-4 py-2 text-right font-medium">Low</th>
                <th className="px-4 py-2 text-right font-medium">Out</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(byCategory).map(([cat, data]) => (
                <tr key={cat} className="hover:bg-muted/10">
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-700"}`}>
                      {CATEGORY_LABELS[cat] ?? cat}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">{data.total}</td>
                  <td className="px-4 py-2.5 text-right text-amber-600">{data.low}</td>
                  <td className="px-4 py-2.5 text-right text-red-600">{data.out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* By location */}
        <div className="rounded-xl border overflow-hidden">
          <div className="px-4 py-3 bg-muted/30 border-b font-medium text-sm">By Location</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Location</th>
                <th className="px-4 py-2 text-right font-medium">Total Items</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {Object.entries(byLocation).map(([loc, qty]) => (
                <tr key={loc} className="hover:bg-muted/10">
                  <td className="px-4 py-2.5 font-medium">{loc}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reorder list */}
      {reorderItems.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b font-medium text-sm text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Reorder List ({reorderItems.length} items)
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/20">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Category</th>
                <th className="px-4 py-2 text-left font-medium">Size</th>
                <th className="px-4 py-2 text-left font-medium hidden sm:table-cell">Color</th>
                <th className="px-4 py-2 text-left font-medium">Location</th>
                <th className="px-4 py-2 text-right font-medium">Current</th>
                <th className="px-4 py-2 text-right font-medium">Min</th>
                <th className="px-4 py-2 text-right font-medium">Order Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reorderItems.map((s) => (
                <tr key={s.id} className={`hover:bg-muted/10 ${s.qty === 0 ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[s.category] ?? "bg-gray-100"}`}>
                      {CATEGORY_LABELS[s.category] ?? s.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono">{s.size}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-muted-foreground">{s.color || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.location}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-red-600">{s.qty}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">{s.minStock}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-amber-700">{s.minStock - s.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

