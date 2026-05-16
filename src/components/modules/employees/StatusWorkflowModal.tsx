"use client";

import * as React from "react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

type TransitionDef = {
  to: string;
  label: string;
  variant: "default" | "secondary" | "warning" | "danger" | "success";
};

const TRANSITIONS: Record<string, TransitionDef[]> = {
  PROBATION: [
    { to: "ACTIVE", label: "Confirm Active", variant: "success" },
    { to: "TERMINATED", label: "Terminate", variant: "danger" },
  ],
  ACTIVE: [
    { to: "ON_LEAVE", label: "Put on Leave", variant: "warning" },
    { to: "SUSPENDED", label: "Suspend", variant: "warning" },
    { to: "TERMINATED", label: "Terminate", variant: "danger" },
    { to: "PROBATION", label: "Set Probation", variant: "secondary" },
  ],
  ON_LEAVE: [
    { to: "ACTIVE", label: "Return to Active", variant: "success" },
    { to: "TERMINATED", label: "Terminate", variant: "danger" },
  ],
  SUSPENDED: [
    { to: "ACTIVE", label: "Reinstate", variant: "success" },
    { to: "TERMINATED", label: "Terminate", variant: "danger" },
  ],
  TERMINATED: [],
};

function getButtonClasses(
  variant: TransitionDef["variant"],
  isSelected: boolean
): string {
  const base =
    "px-3 py-2 rounded-md border text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  if (isSelected) {
    switch (variant) {
      case "success":
        return cn(base, "bg-emerald-600 text-white border-emerald-600 shadow-sm");
      case "warning":
        return cn(base, "bg-amber-500 text-white border-amber-500 shadow-sm");
      case "danger":
        return cn(base, "bg-destructive text-destructive-foreground border-destructive shadow-sm");
      case "secondary":
        return cn(base, "bg-secondary text-secondary-foreground border-secondary shadow-sm");
      case "default":
      default:
        return cn(base, "bg-primary text-primary-foreground border-primary shadow-sm");
    }
  }

  switch (variant) {
    case "success":
      return cn(base, "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40");
    case "warning":
      return cn(base, "border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-900/20 dark:hover:bg-amber-900/40");
    case "danger":
      return cn(base, "border-red-200 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40");
    case "secondary":
      return cn(base, "border-input text-muted-foreground bg-background hover:bg-accent hover:text-accent-foreground");
    case "default":
    default:
      return cn(base, "border-input text-foreground bg-background hover:bg-accent hover:text-accent-foreground");
  }
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "warning" | "danger" | "success" | "outline" {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "PROBATION":
      return "secondary";
    case "ON_LEAVE":
      return "warning";
    case "SUSPENDED":
      return "warning";
    case "TERMINATED":
      return "danger";
    default:
      return "outline";
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  employeeName: string;
  onConfirm: (newStatus: string, notes: string) => Promise<void>;
  isLoading?: boolean;
};

export function StatusWorkflowModal({
  open,
  onOpenChange,
  currentStatus,
  employeeName,
  onConfirm,
  isLoading = false,
}: Props) {
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const availableTransitions = TRANSITIONS[currentStatus] ?? [];

  function handleOpenChange(nextOpen: boolean) {
    if (!isLoading) {
      onOpenChange(nextOpen);
      if (!nextOpen) {
        setSelectedTransition(null);
        setNotes("");
      }
    }
  }

  async function handleConfirm() {
    if (!selectedTransition) return;
    await onConfirm(selectedTransition, notes);
    setSelectedTransition(null);
    setNotes("");
  }

  const canConfirm = !!selectedTransition && !isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Employment Status</DialogTitle>
          <DialogDescription>
            Update the status for{" "}
            <span className="font-medium text-foreground">{employeeName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Current status */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current status:</span>
            <Badge variant={getStatusBadgeVariant(currentStatus)}>
              {currentStatus.replace(/_/g, " ")}
            </Badge>
          </div>

          {/* Transitions */}
          {availableTransitions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No status transitions available from{" "}
              <span className="font-medium">{currentStatus.replace(/_/g, " ")}</span>.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Select new status:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableTransitions.map((transition) => (
                  <button
                    key={transition.to}
                    type="button"
                    disabled={isLoading}
                    onClick={() =>
                      setSelectedTransition(
                        selectedTransition === transition.to ? null : transition.to
                      )
                    }
                    className={getButtonClasses(
                      transition.variant,
                      selectedTransition === transition.to
                    )}
                  >
                    {transition.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="status-notes"
              className="text-sm font-medium text-foreground"
            >
              Notes{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="status-notes"
              placeholder="Add a reason or note for this status change..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Confirm Change"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
