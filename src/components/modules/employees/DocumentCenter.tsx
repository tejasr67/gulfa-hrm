"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  Upload,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { DocumentUploadModal } from "./DocumentUploadModal";
import { formatDate, getExpiryStatus } from "@/lib/utils/formatters";
import { useEmployeeDocuments } from "@/modules/employees/hooks";
import { deleteDocumentAction } from "@/modules/employees/actions";
import type { EmployeeDocumentWithType } from "@/modules/employees/types";
import { cn } from "@/lib/utils/cn";
import type { BadgeProps } from "@/components/ui/badge";

type DocumentType = {
  id: string;
  name: string;
  requiresExpiry: boolean;
};

// Extend the generated type with fields present in schema but not yet in
// the generated Prisma client (pending `prisma generate`)
type DocWithExtendedFields = EmployeeDocumentWithType & {
  mimeType?: string | null;
  fileName?: string | null;
  storagePath?: string | null;
  fileSize?: number | null;
  uploadedBy?: string | null;
};

type Props = {
  employeeId: string;
  canUpload?: boolean;
  canDelete?: boolean;
};

function getFileIcon(mimeType: string | null | undefined): React.ReactNode {
  if (!mimeType) return <File className="h-5 w-5 text-muted-foreground" />;
  if (mimeType.startsWith("image/"))
    return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (
    mimeType === "application/pdf" ||
    mimeType === "application/msword" ||
    mimeType.includes("wordprocessingml")
  )
    return <FileText className="h-5 w-5 text-primary" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

function expiryBadgeVariant(
  status: ReturnType<typeof getExpiryStatus>
): BadgeProps["variant"] {
  switch (status) {
    case "expired":
      return "danger";
    case "critical":
      return "warning";
    case "warning":
      return "info";
    case "ok":
      return "success";
    default:
      return "secondary";
  }
}

function expiryBadgeLabel(status: ReturnType<typeof getExpiryStatus>): string {
  switch (status) {
    case "expired":
      return "Expired";
    case "critical":
      return "Expiring Soon";
    case "warning":
      return "Due 60 Days";
    case "ok":
      return "Valid";
    default:
      return "No Expiry";
  }
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
      <div className="h-9 w-9 rounded-lg bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-36 rounded bg-muted animate-pulse" />
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-5 w-16 rounded-full bg-muted animate-pulse" />
      <div className="flex gap-2">
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        <div className="h-8 w-8 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  employeeId,
  canDelete,
  isDeleting,
  onDelete,
  onDownload,
  isDownloading,
}: {
  doc: DocWithExtendedFields;
  employeeId: string;
  canDelete?: boolean;
  isDeleting: boolean;
  onDelete: (docId: string) => void;
  onDownload: (docId: string) => void;
  isDownloading: boolean;
}) {
  const expiryStatus = getExpiryStatus(doc.expiryDate ?? null);
  const showExpiry = expiryStatus !== "none";

  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted/30",
        isDeleting && "opacity-50 pointer-events-none"
      )}
    >
      {/* File icon */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
        {getFileIcon(doc.mimeType)}
      </div>

      {/* Document info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm leading-snug">
            {doc.documentType.name}
          </span>
          {doc.documentNumber && (
            <span className="font-mono text-xs text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/40">
              {doc.documentNumber}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {doc.issueDate && (
            <span>Issued: {formatDate(doc.issueDate)}</span>
          )}
          {doc.expiryDate && (
            <>
              {doc.issueDate && <span>·</span>}
              <span>Expires: {formatDate(doc.expiryDate)}</span>
            </>
          )}
          {doc.fileName && (
            <>
              {(doc.issueDate || doc.expiryDate) && <span>·</span>}
              <span className="truncate max-w-[12rem]">{doc.fileName}</span>
            </>
          )}
        </div>
      </div>

      {/* Expiry badge */}
      <div className="shrink-0">
        {showExpiry && (
          <Badge variant={expiryBadgeVariant(expiryStatus)}>
            {expiryBadgeLabel(expiryStatus)}
          </Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {doc.storagePath && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Download"
            disabled={isDownloading}
            onClick={() => onDownload(doc.id)}
          >
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </Button>
        )}
        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            title="Delete document"
            disabled={isDeleting}
            onClick={() => onDelete(doc.id)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export function DocumentCenter({ employeeId, canUpload, canDelete }: Props) {
  const { documents, isLoading, error, refetch } = useEmployeeDocuments(employeeId);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch document types
  useEffect(() => {
    fetch("/api/document-types")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setDocumentTypes(json.data);
        }
      })
      .catch(() => {
        // Silently fail — upload modal will just have empty select
      });
  }, []);

  async function handleDelete(docId: string) {
    if (!confirm("Are you sure you want to delete this document? This cannot be undone.")) {
      return;
    }
    setDeletingDocId(docId);
    setDeleteError(null);
    try {
      const result = await deleteDocumentAction(docId, employeeId);
      if (result.success) {
        refetch();
      } else {
        setDeleteError(result.error ?? "Failed to delete document.");
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete document."
      );
    } finally {
      setDeletingDocId(null);
    }
  }

  async function handleDownload(docId: string) {
    setDownloadingDocId(docId);
    try {
      const response = await fetch(
        `/api/employees/${employeeId}/documents/${docId}/download`
      );
      const json = await response.json();
      if (json.success && json.data?.signedUrl) {
        window.open(json.data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Silent fail — no toast system wired yet
    } finally {
      setDownloadingDocId(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">Documents</h3>
          {!isLoading && (
            <Badge variant="secondary" className="tabular-nums">
              {documents.length}
            </Badge>
          )}
        </div>
        {canUpload && (
          <Button
            size="sm"
            onClick={() => setUploadModalOpen(true)}
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{deleteError}</p>
        </div>
      )}

      {/* Fetch error */}
      {error && !isLoading && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Document list */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents uploaded"
            description="Upload the employee's identity and legal documents here."
            action={
              canUpload ? (
                <Button size="sm" onClick={() => setUploadModalOpen(true)}>
                  <Upload className="h-4 w-4" />
                  Upload First Document
                </Button>
              ) : undefined
            }
          />
        ) : (
          (documents as DocWithExtendedFields[]).map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              employeeId={employeeId}
              canDelete={canDelete}
              isDeleting={deletingDocId === doc.id}
              onDelete={handleDelete}
              onDownload={handleDownload}
              isDownloading={downloadingDocId === doc.id}
            />
          ))
        )}
      </div>

      {/* Upload modal */}
      <DocumentUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        employeeId={employeeId}
        documentTypes={documentTypes}
        onSuccess={() => {
          setUploadModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
}
