"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AddDisciplinaryDialog } from "@/components/modules/disciplinary/AddDisciplinaryDialog";
import {
  useDisciplinaryRecords,
  useDisciplinaryTypes,
  useDisciplinaryStats,
  useUpdateDisciplinaryRecord,
} from "@/modules/disciplinary/hooks";
import type { DisciplinaryStats, DisciplinaryRecordItem } from "@/modules/disciplinary/hooks";

type Props = { initialStats: DisciplinaryStats };

const SEVERITY_MAP: Record<string, { label: string; color: string }> = {
  MINOR: { label: "Minor", color: "bg-yellow-50 text-yellow-700" },
  MODERATE: { label: "Moderate", color: "bg-orange-50 text-orange-700" },
  MAJOR: { label: "Major", color: "bg-red-50 text-red-700" },
  CRITICAL: { label: "Critical", color: "bg-gray-900 text-white" },
};

const STATUS_MAP: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  CLOSED: "bg-green-50 text-green-700",
  APPEALED: "bg-amber-50 text-amber-700",
};

export function DisciplinaryClient({ initialStats }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: stats } = useDisciplinaryStats();
  const effectiveStats = stats ?? initialStats;
  const { data: records, isLoading, refetch } = useDisciplinaryRecords({
    search: search || undefined,
    status: statusFilter || undefined,
    typeId: typeFilter || undefined,
  });
  const { data: types } = useDisciplinaryTypes();

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const STAT_CARDS = [
    { label: "Open Cases", value: effectiveStats.open, color: "text-blue-600" },
    { label: "Closed", value: effectiveStats.closed, color: "text-green-600" },
    { label: "Under Appeal", value: effectiveStats.appealed, color: "text-amber-600" },
    { label: "Critical Cases", value: effectiveStats.terminations, color: "text-red-600" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border">
        <div className="border-b px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search employee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="APPEALED">Appealed</option>
            </select>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Record
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No disciplinary records</p>
            <p className="text-sm text-muted-foreground mt-1">Records will appear here once added.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Employee</th>
                  <th className="text-left px-4 py-3 font-medium">Type / Severity</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Incident Date</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Description</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => (
                  <DisciplinaryRow key={r.id} record={r} onRefresh={handleRefresh} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddDisciplinaryDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleRefresh}
        types={types}
      />
    </>
  );
}

function DisciplinaryRow({ record, onRefresh }: { record: DisciplinaryRecordItem; onRefresh: () => void }) {
  const { trigger, isMutating } = useUpdateDisciplinaryRecord(record.id);
  const sev = SEVERITY_MAP[record.disciplinaryType.severity] ?? { label: record.disciplinaryType.severity, color: "bg-gray-100 text-gray-600" };

  async function handleClose() {
    if (!confirm("Close this disciplinary case?")) return;
    const res = await trigger({ status: "CLOSED" });
    if (res?.success) onRefresh();
    else alert(res?.error ?? "Failed");
  }

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium">{record.employee.firstName} {record.employee.lastName}</p>
        <p className="text-xs text-muted-foreground">{record.employee.employeeId}{record.employee.department ? ` · ${record.employee.department.name}` : ""}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-xs">{record.disciplinaryType.name}</p>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${sev.color}`}>
          {sev.label}
        </span>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
        {format(new Date(record.incidentDate), "dd MMM yyyy")}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell max-w-[200px]">
        <p className="truncate text-sm">{record.description}</p>
        <p className="text-xs text-muted-foreground truncate">{record.action}</p>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_MAP[record.status] ?? "bg-gray-100 text-gray-600"}`}>
          {record.status}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {record.status === "OPEN" && (
          <Button size="sm" variant="ghost" onClick={handleClose} disabled={isMutating}>
            Close
          </Button>
        )}
      </td>
    </tr>
  );
}
