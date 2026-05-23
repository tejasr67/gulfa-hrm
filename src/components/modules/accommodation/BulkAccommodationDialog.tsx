"use client";

import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle2, XCircle, FileSpreadsheet } from "lucide-react";
import { useBulkAccommodation } from "@/modules/accommodation/hooks";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type ResultRow = {
  row: number;
  action: string;
  employeeId: string;
  status: "ok" | "error";
  message?: string;
};

// Column layout for the Excel template
const TEMPLATE_COLUMNS = [
  "Action",
  "Employee ID",
  "Property Name",
  "Room Number",
  "Monthly Rent (AED)",
  "Notes",
];

const ACTION_NOTES = [
  ["ASSIGN", "Assign employee to a room (must not already be assigned)"],
  ["VACATE", "Mark employee as vacated from current room (Property/Room not needed)"],
  ["MOVE", "Move employee from current room to a new room"],
];

const EXAMPLE_ROWS = [
  ["ASSIGN", "EMP-0042", "Ajman Accommodation", "Room 1", "", ""],
  ["VACATE", "EMP-0100", "", "", "", "Contract ended"],
  ["MOVE", "EMP-0055", "Dubai 103", "Room 2", "500", "Transferred to Dubai"],
];

// Property names that must be used in the template
const PROPERTY_NAMES = [
  "Ajman Accommodation",
  "Dubai 103",
  "Dubai 302",
  "Dubai G-4",
  "Factory Accommodation",
];

function downloadTemplate() {
  // Dynamic import so xlsx stays out of the main bundle
  import("xlsx").then((XLSX) => {
    const wb = XLSX.utils.book_new();

    // ── Main ops sheet ───────────────────────────────────────────────────────
    const wsData: unknown[][] = [
      TEMPLATE_COLUMNS,
      ...EXAMPLE_ROWS,
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 18 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, "Operations");

    // ── Reference sheet ──────────────────────────────────────────────────────
    const refData: unknown[][] = [
      ["Action Types", "", "Property Names (use exactly as shown)"],
      ...ACTION_NOTES.map((a, i) => [a[0], a[1], PROPERTY_NAMES[i] ?? ""]),
      ["", "", PROPERTY_NAMES[3] ?? ""],
      ["", "", PROPERTY_NAMES[4] ?? ""],
      ["", "", ""],
      ["Notes", "", ""],
      ["• Employee ID must match EMP-XXXX format exactly", "", ""],
      ["• VACATE: Property Name and Room Number are not required", "", ""],
      ["• MOVE: vacates current room then assigns to new room", "", ""],
    ];
    const wsRef = XLSX.utils.aoa_to_sheet(refData);
    wsRef["!cols"] = [{ wch: 50 }, { wch: 50 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsRef, "Reference");

    XLSX.writeFile(wb, "accommodation_bulk_operations.xlsx");
  });
}

export function BulkAccommodationDialog({ open, onClose, onSuccess }: Props) {
  const { trigger, isMutating } = useBulkAccommodation();
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState({ succeeded: 0, failed: 0 });
  const [parseError, setParseError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("upload");
    setRows([]);
    setResults([]);
    setSummary({ succeeded: 0, failed: 0 });
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() { reset(); onClose(); }

  async function handleFile(file: File) {
    setParseError("");
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const valid = parsed.filter((r) => {
        const action = String(r["Action"] ?? "").toUpperCase().trim();
        return ["ASSIGN", "VACATE", "MOVE"].includes(action) && String(r["Employee ID"] ?? "").trim();
      });
      if (valid.length === 0) {
        setParseError("No valid rows found. Check that Action column contains ASSIGN, VACATE, or MOVE and Employee ID is filled.");
        return;
      }
      if (valid.length > 300) {
        setParseError("Max 300 rows per import. Split your file.");
        return;
      }
      setRows(valid);
      setStep("preview");
    } catch {
      setParseError("Could not parse the file. Make sure it's a valid .xlsx or .csv file.");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleImport() {
    const res = await trigger(rows);
    if (!res?.success || !res.data) {
      setParseError(res?.error ?? "Import failed");
      return;
    }
    setResults(res.data.results as ResultRow[]);
    setSummary({ succeeded: res.data.succeeded, failed: res.data.failed });
    setStep("result");
    if (res.data.succeeded > 0) onSuccess();
  }

  const ACTION_COLORS: Record<string, string> = {
    ASSIGN: "bg-blue-100 text-blue-800",
    VACATE: "bg-orange-100 text-orange-800",
    MOVE: "bg-purple-100 text-purple-800",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Accommodation Operations
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
              <p className="font-medium">Supported operations:</p>
              <ul className="space-y-1 text-muted-foreground">
                {ACTION_NOTES.map(([a, d]) => (
                  <li key={a}><span className="font-mono font-medium text-foreground">{a}</span> — {d}</li>
                ))}
              </ul>
            </div>

            <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full justify-start gap-2">
              <Download className="h-4 w-4" />
              Download Template (.xlsx)
            </Button>

            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">Drop your .xlsx / .csv file here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{rows.length} operation{rows.length !== 1 ? "s" : ""} ready to process.</p>
            <div className="rounded-lg border overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Action</th>
                    <th className="px-3 py-2 text-left font-medium">Employee ID</th>
                    <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Property</th>
                    <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Room</th>
                    <th className="px-3 py-2 text-left font-medium hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r, i) => {
                    const action = String(r["Action"] ?? "").toUpperCase().trim();
                    return (
                      <tr key={i} className="hover:bg-muted/20">
                        <td className="px-3 py-1.5 text-muted-foreground">{i + 2}</td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 font-medium text-xs ${ACTION_COLORS[action] ?? "bg-gray-100 text-gray-700"}`}>
                            {action}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono">{String(r["Employee ID"] ?? "")}</td>
                        <td className="px-3 py-1.5 hidden sm:table-cell text-muted-foreground">{String(r["Property Name"] ?? "")}</td>
                        <td className="px-3 py-1.5 hidden sm:table-cell text-muted-foreground">{String(r["Room Number"] ?? "")}</td>
                        <td className="px-3 py-1.5 hidden md:table-cell text-muted-foreground truncate max-w-[120px]">{String(r["Notes"] ?? "")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          </div>
        )}

        {step === "result" && (
          <div className="space-y-3">
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700">{summary.succeeded} succeeded</span>
              </div>
              {summary.failed > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">{summary.failed} failed</span>
                </div>
              )}
            </div>
            {summary.failed > 0 && (
              <div className="rounded-lg border overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Row</th>
                      <th className="px-3 py-2 text-left font-medium">Action</th>
                      <th className="px-3 py-2 text-left font-medium">Employee</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {results.filter(r => r.status === "error").map((r) => (
                      <tr key={r.row} className="bg-red-50/50">
                        <td className="px-3 py-1.5 text-muted-foreground">{r.row}</td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 font-medium text-xs ${ACTION_COLORS[r.action] ?? "bg-gray-100 text-gray-700"}`}>{r.action}</span>
                        </td>
                        <td className="px-3 py-1.5 font-mono">{r.employeeId}</td>
                        <td className="px-3 py-1.5 text-destructive font-medium">Failed</td>
                        <td className="px-3 py-1.5 text-destructive">{r.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>Close</Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => { setStep("upload"); setRows([]); }}>Back</Button>
              <Button onClick={handleImport} disabled={isMutating}>
                {isMutating ? "Processing…" : `Process ${rows.length} Operation${rows.length !== 1 ? "s" : ""}`}
              </Button>
            </>
          )}
          {step === "result" && (
            <>
              {summary.failed > 0 && <Button variant="outline" onClick={reset}>Import More</Button>}
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
