"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle2, XCircle, FileSpreadsheet, RefreshCw, ListOrdered, ArrowRight } from "lucide-react";
import { useBulkUniform, useSyncMasterFile, type SyncPreviewRow } from "@/modules/uniforms/hooks";

type Props = { open: boolean; onClose: () => void; onSuccess: () => void; locations: string[] };
type ResultRow = { row: number; status: "ok" | "error"; message?: string; key?: string };
type Mode = "bulk" | "sync";
type Step = "mode" | "upload" | "preview" | "result";

// ── Bulk update constants ──────────────────────────────────────────────────

const ACTION_NOTES = [
  ["SET", "Set the quantity to the exact value (upserts if SKU doesn't exist)"],
  ["ADD", "Add to the current quantity (must exist)"],
  ["SUBTRACT", "Subtract from the current quantity (floor 0, must exist)"],
];

const EXAMPLE_ROWS = [
  ["SET", "TSHIRT", "L", "Blue", "Ajman", 25, 3],
  ["ADD", "PANTS", "32", "", "DIP", 10, ""],
  ["SUBTRACT", "SHOES", "44", "", "Ajman", 2, ""],
  ["SET", "CAPS", "ONE SIZE", "", "DIP", 15, 10],
];

function downloadBulkTemplate(locations: string[]) {
  import("xlsx").then((XLSX) => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["Action", "Category", "Size", "Color", "Location", "Qty", "Min Stock"],
      ...EXAMPLE_ROWS,
    ]);
    ws["!cols"] = [{ wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 6 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, "Stock Update");

    const refData = [
      ["Action Types", "", "Categories", "", "Locations"],
      ...ACTION_NOTES.map((a, i) => [a[0], a[1], ["TSHIRT", "PANTS", "SHOES", "CAPS", "OTHER"][i] ?? "", "", locations[i] ?? ""]),
      ["", "", "", "", ...locations.slice(3)],
      ["", "", "", "", ""],
      ["Notes"],
      ["• Category must be: TSHIRT, PANTS, SHOES, CAPS, or OTHER"],
      ["• Color: only for TSHIRT (Red, White, Blue, Grey…). Leave blank for others"],
      ["• Min Stock: optional, only used with SET action"],
      ["• SET + new SKU: creates the row automatically"],
    ];
    const wsRef = XLSX.utils.aoa_to_sheet(refData);
    wsRef["!cols"] = [{ wch: 12 }, { wch: 48 }, { wch: 12 }, { wch: 2 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsRef, "Reference");

    XLSX.writeFile(wb, "uniform_stock_bulk_update.xlsx");
  });
}

const ACTION_COLORS: Record<string, string> = {
  SET: "bg-blue-100 text-blue-800",
  ADD: "bg-green-100 text-green-800",
  SUBTRACT: "bg-orange-100 text-orange-800",
};

// ── Main component ─────────────────────────────────────────────────────────

export function BulkUniformDialog({ open, onClose, onSuccess, locations }: Props) {
  const { trigger: bulkTrigger, isMutating: bulkMutating } = useBulkUniform();
  const { preview: syncPreview, sync: syncCommit, isMutating: syncMutating } = useSyncMasterFile();

  const [mode, setMode] = useState<Mode>("bulk");
  const [step, setStep] = useState<Step>("mode");
  const [parseError, setParseError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Bulk state
  const [bulkRows, setBulkRows] = useState<Record<string, unknown>[]>([]);
  const [bulkResults, setBulkResults] = useState<ResultRow[]>([]);
  const [bulkSummary, setBulkSummary] = useState({ succeeded: 0, failed: 0 });

  // Sync state
  const [syncSheets, setSyncSheets] = useState<Record<string, unknown[][]>>({});
  const [syncPreviewRows, setSyncPreviewRows] = useState<SyncPreviewRow[]>([]);
  const [syncWarnings, setSyncWarnings] = useState<string[]>([]);
  const [syncParseCount, setSyncParseCount] = useState(0);
  const [syncResult, setSyncResult] = useState<{ upserted: number; unchanged: number; errors: string[] } | null>(null);
  const [showAllSync, setShowAllSync] = useState(false);

  const isMutating = mode === "bulk" ? bulkMutating : syncMutating;

  function reset() {
    setStep("mode");
    setParseError("");
    setBulkRows([]); setBulkResults([]); setBulkSummary({ succeeded: 0, failed: 0 });
    setSyncSheets({}); setSyncPreviewRows([]); setSyncWarnings([]); setSyncParseCount(0);
    setSyncResult(null); setShowAllSync(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Bulk file handler ────────────────────────────────────────────────────

  async function handleBulkFile(file: File) {
    setParseError("");
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const valid = parsed.filter((r) => {
        const action = String(r["Action"] ?? "").toUpperCase().trim();
        return ["SET", "ADD", "SUBTRACT"].includes(action) && String(r["Category"] ?? "").trim() && String(r["Size"] ?? "").trim();
      });
      if (valid.length === 0) { setParseError("No valid rows found. Check Action, Category, and Size columns."); return; }
      if (valid.length > 500) { setParseError("Max 500 rows per import."); return; }
      setBulkRows(valid);
      setStep("preview");
    } catch {
      setParseError("Could not parse the file.");
    }
  }

  async function handleBulkImport() {
    const res = await bulkTrigger(bulkRows);
    if (!res?.success || !res.data) { setParseError(res?.error ?? "Import failed"); return; }
    setBulkResults(res.data.results as ResultRow[]);
    setBulkSummary({ succeeded: res.data.succeeded, failed: res.data.failed });
    setStep("result");
    if (res.data.succeeded > 0) onSuccess();
  }

  // ── Sync file handler ────────────────────────────────────────────────────

  async function handleSyncFile(file: File) {
    setParseError("");
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      const sheets: Record<string, unknown[][]> = {};
      for (const name of wb.SheetNames) {
        sheets[name] = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: "" });
      }

      if (Object.keys(sheets).length === 0) { setParseError("No sheets found in the file."); return; }

      setSyncSheets(sheets);

      // Call preview API
      const res = await syncPreview(sheets);
      if (!res?.success || !res.data) { setParseError(res?.error ?? "Preview failed"); return; }

      setSyncPreviewRows(res.data.preview);
      setSyncWarnings(res.data.warnings ?? []);
      setSyncParseCount(res.data.parseCount);
      setStep("preview");
    } catch {
      setParseError("Could not parse the file.");
    }
  }

  async function handleSyncCommit() {
    const res = await syncCommit(syncSheets);
    if (!res?.success || !res.data) { setParseError(res?.error ?? "Sync failed"); return; }
    setSyncResult({ upserted: res.data.upserted, unchanged: res.data.unchanged, errors: res.data.errors });
    setStep("result");
    if (res.data.upserted > 0) onSuccess();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const changedRows = syncPreviewRows.filter((r) => r.changed);
  const displayedSyncRows = showAllSync ? syncPreviewRows : changedRows;

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {step === "mode" ? "Uniform Stock Update" : mode === "bulk" ? "Bulk Stock Update" : "Sync from Master File"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Mode selection ──────────────────────────────────────────── */}
        {step === "mode" && (
          <div className="grid grid-cols-2 gap-4 py-2">
            <button
              onClick={() => { setMode("bulk"); setStep("upload"); }}
              className="rounded-xl border-2 border-border hover:border-primary/50 p-5 text-left transition-colors group"
            >
              <ListOrdered className="h-8 w-8 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="font-semibold mb-1">Bulk Update</p>
              <p className="text-sm text-muted-foreground">Upload a flat spreadsheet with SET / ADD / SUBTRACT actions per SKU.</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                Choose <ArrowRight className="h-3 w-3" />
              </div>
            </button>
            <button
              onClick={() => { setMode("sync"); setStep("upload"); }}
              className="rounded-xl border-2 border-border hover:border-primary/50 p-5 text-left transition-colors group"
            >
              <RefreshCw className="h-8 w-8 mb-3 text-muted-foreground group-hover:text-primary transition-colors" />
              <p className="font-semibold mb-1">Sync from Master File</p>
              <p className="text-sm text-muted-foreground">Upload the Gulfa Uniform Stock Tracker Excel to sync all quantities from the source of truth.</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                Choose <ArrowRight className="h-3 w-3" />
              </div>
            </button>
          </div>
        )}

        {/* ── Upload ─────────────────────────────────────────────────── */}
        {step === "upload" && mode === "bulk" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium">Supported actions:</p>
              <ul className="space-y-1 text-muted-foreground">
                {ACTION_NOTES.map(([a, d]) => (
                  <li key={a}><span className="font-mono font-medium text-foreground">{a}</span> — {d}</li>
                ))}
              </ul>
            </div>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => downloadBulkTemplate(locations)}>
              <Download className="h-4 w-4" />Download Template (.xlsx)
            </Button>
            <DropZone fileRef={fileRef} onFile={handleBulkFile} />
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </div>
        )}

        {step === "upload" && mode === "sync" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium">How it works:</p>
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>Upload <span className="font-mono text-foreground">Gulfa Uniform_Stock_Tracker.xlsx</span> (the exact 5-sheet format)</li>
                <li>A preview will show every SKU and what will change</li>
                <li>Confirm to write changes — existing quantities are overwritten</li>
              </ul>
              <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mt-2">
                Expected sheets: <span className="font-mono">T-Shirts-DIP</span>, <span className="font-mono">Pants &amp; Shoes-DIP</span>, <span className="font-mono">T-Shirts-Ajman</span>, <span className="font-mono">Pants &amp; Shoes-Ajman</span>
              </p>
            </div>
            <DropZone fileRef={fileRef} onFile={handleSyncFile} label="Drop the master Excel file here" loading={syncMutating} />
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </div>
        )}

        {/* ── Preview ────────────────────────────────────────────────── */}
        {step === "preview" && mode === "bulk" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{bulkRows.length} row{bulkRows.length !== 1 ? "s" : ""} ready to process.</p>
            <div className="rounded-lg border overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>{["#", "Action", "Category", "Size", "Color", "Location", "Qty", "Min Stock"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y">
                  {bulkRows.map((r, i) => {
                    const action = String(r["Action"] ?? "").toUpperCase().trim();
                    return (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 2}</td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 font-medium text-xs ${ACTION_COLORS[action] ?? "bg-gray-100"}`}>{action}</span>
                        </td>
                        <td className="px-3 py-1.5">{String(r["Category"] ?? "")}</td>
                        <td className="px-3 py-1.5 font-mono">{String(r["Size"] ?? "")}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{String(r["Color"] ?? "")}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{String(r["Location"] ?? "")}</td>
                        <td className="px-3 py-1.5 font-semibold">{String(r["Qty"] ?? "")}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{String(r["Min Stock"] ?? "")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </div>
        )}

        {step === "preview" && mode === "sync" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{syncParseCount}</span> SKUs parsed ·{" "}
                <span className="font-medium text-amber-700">{changedRows.length}</span> will change
              </div>
              <button
                className="text-xs text-primary underline underline-offset-2"
                onClick={() => setShowAllSync((v) => !v)}
              >
                {showAllSync ? `Show changed only (${changedRows.length})` : `Show all (${syncPreviewRows.length})`}
              </button>
            </div>

            {syncWarnings.length > 0 && (
              <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 space-y-0.5">
                {syncWarnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-800">⚠ {w}</p>
                ))}
              </div>
            )}

            <div className="rounded-lg border overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {["Category", "Size", "Color", "Location", "Old Qty", "New Qty", "Min Stock"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayedSyncRows.map((r, i) => (
                    <tr key={i} className={r.changed ? "bg-amber-50/60" : "opacity-60"}>
                      <td className="px-3 py-1.5 font-medium">{r.category}</td>
                      <td className="px-3 py-1.5 font-mono">{r.size}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.color || "—"}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.location}</td>
                      <td className="px-3 py-1.5">
                        {r.oldQty === null
                          ? <span className="text-xs text-muted-foreground italic">new</span>
                          : <span className={r.changed ? "line-through text-muted-foreground" : ""}>{r.oldQty}</span>
                        }
                      </td>
                      <td className="px-3 py-1.5 font-semibold">{r.newQty}</td>
                      <td className="px-3 py-1.5 text-muted-foreground">{r.minStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {changedRows.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Everything is already up to date — no changes to apply.</p>
            )}
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </div>
        )}

        {/* ── Result ─────────────────────────────────────────────────── */}
        {step === "result" && mode === "bulk" && (
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700">{bulkSummary.succeeded} succeeded</span>
              </div>
              {bulkSummary.failed > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">{bulkSummary.failed} failed</span>
                </div>
              )}
            </div>
            {bulkSummary.failed > 0 && (
              <div className="rounded-lg border overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Row</th>
                      <th className="px-3 py-2 text-left font-medium">Key</th>
                      <th className="px-3 py-2 text-left font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bulkResults.filter((r) => r.status === "error").map((r) => (
                      <tr key={r.row} className="bg-red-50/50">
                        <td className="px-3 py-1.5 text-muted-foreground">{r.row}</td>
                        <td className="px-3 py-1.5 font-mono text-xs">{r.key ?? "—"}</td>
                        <td className="px-3 py-1.5 text-destructive">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {step === "result" && mode === "sync" && syncResult && (
          <div className="space-y-3">
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700">{syncResult.upserted} updated</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{syncResult.unchanged} unchanged</span>
              </div>
              {syncResult.errors.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">{syncResult.errors.length} error{syncResult.errors.length !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
            {syncResult.errors.length > 0 && (
              <div className="rounded-lg border bg-red-50/50 p-3 space-y-1 max-h-48 overflow-y-auto">
                {syncResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <DialogFooter>
          {step === "mode" && (
            <Button variant="outline" onClick={() => { reset(); onClose(); }}>Close</Button>
          )}
          {step === "upload" && (
            <Button variant="outline" onClick={() => setStep("mode")}>Back</Button>
          )}
          {step === "preview" && mode === "bulk" && (
            <>
              <Button variant="outline" onClick={() => { setStep("upload"); setBulkRows([]); }}>Back</Button>
              <Button onClick={handleBulkImport} disabled={isMutating}>
                {isMutating ? "Processing…" : `Update ${bulkRows.length} Row${bulkRows.length !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
          {step === "preview" && mode === "sync" && (
            <>
              <Button variant="outline" onClick={() => { setStep("upload"); setSyncSheets({}); setSyncPreviewRows([]); }}>Back</Button>
              <Button onClick={handleSyncCommit} disabled={isMutating || changedRows.length === 0}>
                {isMutating ? "Syncing…" : `Apply ${changedRows.length} Change${changedRows.length !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
          {step === "result" && (
            <>
              {(mode === "bulk" ? bulkSummary.failed > 0 : (syncResult?.errors.length ?? 0) > 0) && (
                <Button variant="outline" onClick={reset}>Import More</Button>
              )}
              <Button onClick={() => { reset(); onClose(); }}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function DropZone({ fileRef, onFile, label = "Drop your .xlsx / .csv file here", loading = false }: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
  label?: string;
  loading?: boolean;
}) {
  return (
    <div
      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
      onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => !loading && fileRef.current?.click()}
    >
      {loading
        ? <RefreshCw className="h-8 w-8 mx-auto mb-2 text-muted-foreground animate-spin" />
        : <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
      }
      <p className="font-medium">{loading ? "Analysing file…" : label}</p>
      {!loading && <p className="text-sm text-muted-foreground mt-1">or click to browse</p>}
      <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}
