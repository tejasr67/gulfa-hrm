"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus, FileText, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AddDocumentDialog } from "@/components/modules/documents/AddDocumentDialog";
import { useDocuments, useDocumentTypes, useDocumentStats, useDeleteDocument } from "@/modules/documents/hooks";
import type { DocumentStats, DocumentListItem } from "@/modules/documents/hooks";

type Props = { initialStats: DocumentStats };

function daysUntilExpiry(dateStr: string | null) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(dateStr);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp.getTime() - today.getTime()) / 86_400_000);
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <span className="text-muted-foreground text-xs">No expiry</span>;
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return null;

  if (days < 0) return <span className="text-xs font-medium text-red-600">Expired {Math.abs(days)}d ago</span>;
  if (days <= 30) return <span className="text-xs font-medium text-red-600">Expires in {days}d</span>;
  if (days <= 90) return <span className="text-xs font-medium text-amber-600">Expires in {days}d</span>;
  return <span className="text-xs text-muted-foreground">{format(new Date(expiryDate), "dd MMM yyyy")}</span>;
}

export function DocumentsClient({ initialStats }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("");

  const { data: stats } = useDocumentStats();
  const effectiveStats = stats ?? initialStats;

  const { items, total, isLoading, refetch } = useDocuments({
    search: search || undefined,
    documentTypeId: typeId || undefined,
    status: statusFilter || undefined,
    expiry: (expiryFilter || undefined) as "expired" | "expiring30" | "expiring60" | undefined,
  });
  const { data: types } = useDocumentTypes();

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const STAT_CARDS = [
    { label: "Expired", value: effectiveStats.expired, color: "text-red-600", bg: "bg-red-50", filter: "expired" },
    { label: "Expiring in 30d", value: effectiveStats.expiring30, color: "text-orange-600", bg: "bg-orange-50", filter: "expiring30" },
    { label: "Expiring in 60d", value: effectiveStats.expiring60, color: "text-amber-600", bg: "bg-amber-50", filter: "expiring60" },
    { label: "Valid", value: effectiveStats.valid, color: "text-green-600", bg: "bg-green-50", filter: "" },
  ];

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <Card
            key={s.label}
            className={`cursor-pointer transition-all ${expiryFilter === s.filter && s.filter ? "ring-2 ring-primary" : ""}`}
            onClick={() => setExpiryFilter(expiryFilter === s.filter ? "" : s.filter)}
          >
            <CardContent className="p-4">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert banner */}
      {effectiveStats.expired > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            <span className="font-medium">{effectiveStats.expired} document{effectiveStats.expired !== 1 ? "s" : ""} expired</span>
            {" "}and {effectiveStats.expiring30} expiring within 30 days.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border">
        <div className="border-b px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search employee name or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[160px]"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
            >
              <option value="">All Types</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select
              className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[140px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Document
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No documents found</p>
            <p className="text-sm text-muted-foreground mt-1">Add documents or adjust filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Employee</th>
                  <th className="text-left px-4 py-3 font-medium">Document Type</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Number</th>
                  <th className="text-left px-4 py-3 font-medium">Expiry</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Issued By</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} onDelete={handleRefresh} />
                ))}
              </tbody>
            </table>
            {total > items.length && (
              <div className="px-4 py-3 text-center text-sm text-muted-foreground border-t">
                Showing {items.length} of {total} documents
              </div>
            )}
          </div>
        )}
      </div>

      <AddDocumentDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleRefresh}
        types={types}
      />
    </>
  );
}

function DocumentRow({ doc, onDelete }: { doc: DocumentListItem; onDelete: () => void }) {
  const { trigger: deleteDoc, isMutating } = useDeleteDocument(doc.id);

  async function handleDelete() {
    if (!confirm(`Delete ${doc.documentType.name} for ${doc.employee.firstName} ${doc.employee.lastName}?`)) return;
    const res = await deleteDoc();
    if (res?.success) onDelete();
  }

  const days = daysUntilExpiry(doc.expiryDate);
  const rowClass = days !== null && days < 0
    ? "bg-red-50/50 hover:bg-red-50"
    : days !== null && days <= 30
    ? "bg-amber-50/30 hover:bg-amber-50/50"
    : "hover:bg-muted/20";

  return (
    <tr className={`transition-colors ${rowClass}`}>
      <td className="px-4 py-3">
        <p className="font-medium">{doc.employee.firstName} {doc.employee.lastName}</p>
        <p className="text-xs text-muted-foreground">{doc.employee.employeeId}{doc.employee.department ? ` · ${doc.employee.department.name}` : ""}</p>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
          {doc.documentType.name}
        </span>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
        {doc.documentNumber ?? "—"}
      </td>
      <td className="px-4 py-3">
        <ExpiryBadge expiryDate={doc.expiryDate} />
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
        {doc.issuedBy ?? "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={handleDelete} disabled={isMutating}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}
