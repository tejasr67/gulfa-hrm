"use client";

import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle, XCircle } from "lucide-react";
import { bulkImportAttendanceAction } from "@/modules/attendance/actions";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

type ImportResult = { succeeded: number; failed: number; total: number };

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of row) {
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function downloadTemplate() {
  const header = "employeeId,date,status,checkIn,checkOut,notes";
  const example = "EMP001,2026-05-20,PRESENT,09:00,18:00,On time";
  const blob = new Blob([`${header}\n${example}\n`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "attendance_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkUploadModal({ open, onOpenChange, onSuccess }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<unknown[]>([]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { setError("CSV must have a header row and at least one data row"); return; }

      const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase());
      const records = lines.slice(1).map((line) => {
        const cols = parseCsvRow(line);
        return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""]));
      });
      setPreview(records.slice(0, 5));
    };
    reader.readAsText(file);
  }

  async function handleSubmit() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Please select a CSV file"); return; }
    setError(null);
    setSubmitting(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) { setError("No data rows found"); return; }

      const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase());
      const records = lines.slice(1).map((line) => {
        const cols = parseCsvRow(line);
        const row = Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? ""]));
        return {
          employeeId: row["employeeid"] ?? "",
          date: new Date(row["date"] ?? ""),
          status: (row["status"] ?? "PRESENT").toUpperCase(),
          checkIn: row["checkin"] || undefined,
          checkOut: row["checkout"] || undefined,
          notes: row["notes"] || undefined,
        };
      });

      const res = await bulkImportAttendanceAction({ records });
      if (!res.success) { setError(res.error ?? "Import failed"); return; }
      setResult(res.data!);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (result) onSuccess();
    onOpenChange(false);
    setResult(null);
    setPreview([]);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Attendance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!result ? (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Upload a CSV file with attendance records.</p>
                <Button type="button" variant="outline" size="sm" onClick={downloadTemplate} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Template
                </Button>
              </div>

              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Click to select CSV file</p>
                <p className="text-xs text-muted-foreground mt-1">Columns: employeeId, date, status, checkIn, checkOut, notes</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </div>

              {preview.length > 0 && (
                <div className="rounded-md border text-xs overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        {Object.keys(preview[0] as object).map((k) => (
                          <th key={k} className="px-3 py-2 text-left font-medium text-muted-foreground">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-t">
                          {Object.values(row as object).map((v, j) => (
                            <td key={j} className="px-3 py-2 text-muted-foreground">{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="px-3 py-2 text-muted-foreground border-t">Preview showing first 5 rows</p>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          ) : (
            <div className="text-center py-6 space-y-4">
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                  <span className="text-2xl font-bold">{result.succeeded}</span>
                  <span className="text-xs text-muted-foreground">Imported</span>
                </div>
                {result.failed > 0 && (
                  <div className="flex flex-col items-center gap-1">
                    <XCircle className="h-8 w-8 text-red-500" />
                    <span className="text-2xl font-bold">{result.failed}</span>
                    <span className="text-xs text-muted-foreground">Failed</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{result.total} total records processed</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button type="button" disabled={submitting || preview.length === 0} onClick={handleSubmit}>
              {submitting ? "Importing..." : "Import"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
