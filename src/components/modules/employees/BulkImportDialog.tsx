"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Upload, Download, FileSpreadsheet, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

// ── Template column definitions ───────────────────────────────────────────────

const TEMPLATE_COLUMNS = [
  { key: "firstName",        header: "First Name",          example: "Muhammad",             note: "First name only" },
  { key: "lastName",         header: "Last Name",           example: "Abu Sufyan Saleem",    note: "Family / remaining names" },
  { key: "email",            header: "Email",               example: "ahmed@company.com",    note: "Leave blank to auto-assign" },
  { key: "phone",            header: "Phone",               example: "+971501234567",        note: "" },
  { key: "employmentType",   header: "Employment Type",     example: "FULL_TIME",            note: "FULL_TIME | PART_TIME | CONTRACT | INTERN | FREELANCE" },
  { key: "joiningDate",      header: "DOJ",                 example: "2024-01-15",           note: "Date of Joining — YYYY-MM-DD" },
  { key: "nationality",      header: "Nationality",         example: "Pakistan",             note: "" },
  { key: "gender",           header: "Gender",              example: "MALE",                 note: "MALE | FEMALE | OTHER" },
  { key: "maritalStatus",    header: "Marital Status",      example: "SINGLE",               note: "SINGLE | MARRIED | DIVORCED | WIDOWED" },
  { key: "dateOfBirth",      header: "Date of Birth",       example: "1990-05-20",           note: "YYYY-MM-DD" },
  { key: "emiratesId",       header: "Emirates ID",         example: "784-1990-1234567-1",   note: "Format: 784-XXXX-XXXXXXX-X" },
  { key: "emiratesIdExpiry", header: "Emirates ID Expiry",  example: "2026-12-31",           note: "YYYY-MM-DD" },
  { key: "visaNumber",       header: "Visa Number",         example: "202/2024/1234567",     note: "" },
  { key: "visaExpiry",       header: "Contract Expires",    example: "2026-12-18",           note: "Visa / contract expiry — YYYY-MM-DD" },
  { key: "passportNumber",   header: "Passport Number",     example: "A12345678",            note: "" },
  { key: "passportExpiry",   header: "Passport Expiry",     example: "2029-03-15",           note: "YYYY-MM-DD" },
  { key: "laborCardNumber",  header: "Labour Card Number",  example: "LC-2024-123456",       note: "" },
  { key: "laborCardExpiry",  header: "Labour Card Expiry",  example: "2025-12-31",           note: "YYYY-MM-DD" },
  { key: "bankName",         header: "Bank Name",           example: "Emirates NBD",         note: "" },
  { key: "bankAccount",      header: "Bank Account",        example: "1234567890123456",     note: "" },
  { key: "iban",             header: "IBAN",                example: "AE070331234567890123456", note: "" },
] as const;

type ColumnKey = (typeof TEMPLATE_COLUMNS)[number]["key"];

// ── Types ─────────────────────────────────────────────────────────────────────

type ParsedRow = Partial<Record<ColumnKey, string>>;

type ImportResult = {
  rowIndex: number;
  success: boolean;
  employeeId?: string;
  error?: string;
};

type Step = "idle" | "preview" | "result";

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // Row 1: headers
  const headers = TEMPLATE_COLUMNS.map((c) => c.header);
  // Row 2: notes row
  const notes = TEMPLATE_COLUMNS.map((c) => c.note || "");
  // Row 3: example row
  const examples = TEMPLATE_COLUMNS.map((c) => c.example);

  const ws = XLSX.utils.aoa_to_sheet([headers, notes, examples]);

  // Style: bold header row, light grey notes row
  const range = XLSX.utils.decode_range(ws["!ref"]!);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
    if (ws[headerCell]) {
      ws[headerCell].s = { font: { bold: true }, fill: { fgColor: { rgb: "1E3A5F" }, patternType: "solid" } };
    }
    const noteCell = XLSX.utils.encode_cell({ r: 1, c: C });
    if (ws[noteCell]) {
      ws[noteCell].s = { font: { italic: true, color: { rgb: "888888" } } };
    }
  }

  // Column widths
  ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 22 }));

  XLSX.utils.book_append_sheet(wb, ws, "Employees");
  XLSX.writeFile(wb, "employee_import_template.xlsx");
}

function parseExcelFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          raw: false,
          dateNF: "YYYY-MM-DD",
          defval: "",
        });

        // Build a header → key map (case-insensitive)
        const headerMap: Record<string, ColumnKey> = {};
        for (const col of TEMPLATE_COLUMNS) {
          headerMap[col.header.toLowerCase()] = col.key;
        }

        const parsed: ParsedRow[] = rawRows
          .filter((row) => Object.values(row).some((v) => v !== ""))
          .map((row) => {
            const out: ParsedRow = {};
            for (const [rawKey, val] of Object.entries(row)) {
              const mappedKey = headerMap[rawKey.trim().toLowerCase()];
              if (mappedKey && val !== "") {
                out[mappedKey] = String(val).trim();
              }
            }
            return out;
          })
          .filter((row) => Object.keys(row).length > 0);

        resolve(parsed);
      } catch (err) {
        reject(new Error("Failed to parse file: " + (err instanceof Error ? err.message : "unknown error")));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// ── Preview Table ─────────────────────────────────────────────────────────────

const PREVIEW_COLS: ColumnKey[] = ["firstName", "lastName", "email", "phone", "employmentType", "joiningDate", "nationality"];

function PreviewTable({ rows }: { rows: ParsedRow[] }) {
  const cols = TEMPLATE_COLUMNS.filter((c) => PREVIEW_COLS.includes(c.key));
  return (
    <div className="overflow-auto max-h-56 rounded border text-xs">
      <table className="w-full min-w-max">
        <thead className="bg-muted sticky top-0">
          <tr>
            <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
            {cols.map((c) => (
              <th key={c.key} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/50">
              <td className="px-2 py-1.5 text-muted-foreground">{i + 1}</td>
              {cols.map((c) => (
                <td key={c.key} className="px-2 py-1.5 whitespace-nowrap max-w-[140px] truncate">
                  {row[c.key] ?? <span className="text-muted-foreground/50">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Results List ──────────────────────────────────────────────────────────────

function ResultsList({ results, rows }: { results: ImportResult[]; rows: ParsedRow[] }) {
  const failed = results.filter((r) => !r.success);
  const succeeded = results.filter((r) => r.success);

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="font-medium">{succeeded.length} imported</span>
        </div>
        {failed.length > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">{failed.length} failed</span>
          </div>
        )}
      </div>

      {failed.length > 0 && (
        <div className="overflow-auto max-h-48 rounded border divide-y text-xs">
          {failed.map((r) => {
            const row = rows[r.rowIndex];
            const label = row?.firstName || row?.email || `Row ${r.rowIndex + 1}`;
            return (
              <div key={r.rowIndex} className="flex items-start gap-2 px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <span className="font-medium shrink-0">{label}:</span>
                <span className="text-muted-foreground">{r.error}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Dialog ───────────────────────────────────────────────────────────────

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BulkImportDialog({ open, onOpenChange, onSuccess }: BulkImportDialogProps) {
  const [step, setStep] = useState<Step>("idle");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("idle");
    setRows([]);
    setParseError(null);
    setResults([]);
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(reset, 300);
  }, [onOpenChange, reset]);

  const handleFile = useCallback(async (file: File) => {
    setParseError(null);
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setParseError("Please upload an Excel (.xlsx/.xls) or CSV file.");
      return;
    }
    try {
      const parsed = await parseExcelFile(file);
      if (parsed.length === 0) {
        setParseError("No data rows found. Make sure rows start after the header row.");
        return;
      }
      setRows(parsed);
      setStep("preview");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Failed to parse file.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleImport = useCallback(async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const json = await res.json();
      if (!json.success) {
        setParseError(json.error ?? "Import failed");
        setImporting(false);
        return;
      }
      setResults(json.data.results);
      setStep("result");
      if (json.data.succeeded > 0) onSuccess();
    } catch {
      setParseError("Network error. Please try again.");
    } finally {
      setImporting(false);
    }
  }, [rows, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Bulk Import Employees
          </DialogTitle>
          <DialogDescription>
            Download the template, fill in employee details, then upload. All fields are optional — import whatever data you have.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Step: idle — upload area */}
          {step === "idle" && (
            <>
              {/* Download template button */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Step 1 — Download template</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pre-built Excel with all fields and format hints</p>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="h-4 w-4" />
                  Template
                </Button>
              </div>

              {/* Drop zone */}
              <div
                className={cn(
                  "relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors cursor-pointer",
                  isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <Upload className={cn("h-8 w-8", isDragging ? "text-primary" : "text-muted-foreground")} />
                <div>
                  <p className="text-sm font-medium">
                    {isDragging ? "Drop to upload" : "Step 2 — Upload your file"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag & drop or click to browse · Excel (.xlsx/.xls) or CSV
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="sr-only"
                  onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {parseError}
                </div>
              )}
            </>
          )}

          {/* Step: preview */}
          {step === "preview" && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{rows.length} rows detected</Badge>
                  <span className="text-xs text-muted-foreground">Showing key columns</span>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <X className="h-3.5 w-3.5 mr-1" /> Choose different file
                </Button>
              </div>

              <PreviewTable rows={rows} />

              {parseError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {parseError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={reset} disabled={importing}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Importing…</>
                  ) : (
                    <>Import {rows.length} employees</>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step: result */}
          {step === "result" && (
            <>
              <ResultsList results={results} rows={rows} />
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={reset}>
                  Import more
                </Button>
                <Button onClick={handleClose}>
                  Done
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
