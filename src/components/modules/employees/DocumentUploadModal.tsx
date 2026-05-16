"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { getDocumentUploadUrlAction, saveDocumentAction } from "@/modules/employees/actions";

type DocumentType = {
  id: string;
  name: string;
  requiresExpiry: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  documentTypes: DocumentType[];
  onSuccess: () => void;
};

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.doc,.docx";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
    return "Invalid file type. Accepted: PDF, JPG, PNG, DOC, DOCX.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File too large. Maximum size is 10 MB (your file: ${formatFileSize(file.size)}).`;
  }
  return null;
}

export function DocumentUploadModal({
  open,
  onOpenChange,
  employeeId,
  documentTypes,
  onSuccess,
}: Props) {
  // Step 1 = file selection, step 2 = metadata
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Metadata fields
  const [documentTypeId, setDocumentTypeId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDocType = documentTypes.find((dt) => dt.id === documentTypeId);
  const showExpiryDate = !selectedDocType || selectedDocType.requiresExpiry || true;
  // Always show expiry as per spec; requiresExpiry marks it as required not conditional

  function resetState() {
    setStep(1);
    setSelectedFile(null);
    setFileError(null);
    setIsDragOver(false);
    setDocumentTypeId("");
    setDocumentNumber("");
    setIssueDate("");
    setExpiryDate("");
    setNotes("");
    setIsUploading(false);
    setUploadError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!isUploading) {
      onOpenChange(nextOpen);
      if (!nextOpen) resetState();
    }
  }

  function pickFile(file: File) {
    const err = validateFile(file);
    if (err) {
      setFileError(err);
      setSelectedFile(null);
    } else {
      setFileError(null);
      setSelectedFile(file);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  }

  function handleClearFile() {
    setSelectedFile(null);
    setFileError(null);
  }

  async function handleUpload() {
    if (!selectedFile || !documentTypeId) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      // Step 1: Get signed upload URL
      const urlResult = await getDocumentUploadUrlAction(employeeId, {
        fileName: selectedFile.name,
        mimeType: selectedFile.type,
        fileSize: selectedFile.size,
      });

      if (!urlResult.success || !urlResult.data) {
        setUploadError(urlResult.error ?? "Failed to generate upload URL.");
        return;
      }

      const { signedUrl, storagePath } = urlResult.data;

      // Step 2: Upload file to storage
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadResponse.ok) {
        setUploadError(
          `File upload failed (HTTP ${uploadResponse.status}). Please try again.`
        );
        return;
      }

      // Step 3: Save document record
      const saveResult = await saveDocumentAction(employeeId, {
        documentTypeId,
        documentNumber: documentNumber || undefined,
        issueDate: issueDate ? new Date(issueDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        storagePath,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        notes: notes || undefined,
      });

      if (!saveResult.success) {
        setUploadError(saveResult.error ?? "Failed to save document record.");
        return;
      }

      onSuccess();
      handleOpenChange(false);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
    } finally {
      setIsUploading(false);
    }
  }

  const canUpload =
    !!selectedFile && !!documentTypeId && !isUploading &&
    (!selectedDocType?.requiresExpiry || !!expiryDate);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Select File" : "Document Details"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Choose a file to upload. PDF, JPG, PNG, DOC or DOCX — max 10 MB."
              : "Fill in the document metadata before uploading."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
              step === 1
                ? "bg-primary text-primary-foreground"
                : "bg-emerald-500 text-white"
            )}
          >
            {step > 1 ? "✓" : "1"}
          </div>
          <div className="h-px flex-1 bg-border" />
          <div
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
              step === 2
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            2
          </div>
        </div>

        {/* ── Step 1: File Selection ── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/60 hover:bg-muted/40"
              )}
            >
              <Upload
                className={cn(
                  "mb-3 h-10 w-10 transition-colors",
                  isDragOver ? "text-primary" : "text-muted-foreground"
                )}
              />
              <p className="text-sm font-medium">
                Drop file here or{" "}
                <span className="text-primary underline underline-offset-2">
                  click to browse
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PDF, JPG, PNG, DOC, DOCX — max 10 MB
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileInputChange}
              className="sr-only"
              aria-hidden
            />

            {/* File error */}
            {fileError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{fileError}</p>
              </div>
            )}

            {/* Selected file preview */}
            {selectedFile && !fileError && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <FileText className="h-8 w-8 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearFile();
                  }}
                  className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Remove selected file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Metadata ── */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Document type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Document Type <span className="text-destructive">*</span>
              </label>
              <Select value={documentTypeId} onValueChange={setDocumentTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No document types available
                    </SelectItem>
                  ) : (
                    documentTypes.map((dt) => (
                      <SelectItem key={dt.id} value={dt.id}>
                        {dt.name}
                        {dt.requiresExpiry && (
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            (expiry required)
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Document number */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Document Number{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="e.g. A12345678"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                disabled={isUploading}
              />
            </div>

            {/* Dates row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Issue Date{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Expiry Date{" "}
                  {selectedDocType?.requiresExpiry ? (
                    <span className="text-destructive">*</span>
                  ) : (
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  )}
                </label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={isUploading}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Notes{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isUploading}
                rows={3}
              />
            </div>

            {/* Selected file reminder */}
            {selectedFile && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs text-muted-foreground">
                  {selectedFile.name} &mdash; {formatFileSize(selectedFile.size)}
                </span>
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm text-destructive">{uploadError}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="gap-2 sm:gap-0">
          {step === 1 ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedFile || !!fileError}
                onClick={() => setStep(2)}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setUploadError(null);
                  setStep(1);
                }}
                disabled={isUploading}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleUpload} disabled={!canUpload}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
