"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Loader2, AlertCircle, Paperclip } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";

const formSchema = z.object({
  leaveTypeId: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().optional(),
  isHalfDay: z.boolean().optional().default(false),
  halfDayPeriod: z.enum(["MORNING", "AFTERNOON"]).optional(),
  relieverId: z.string().optional(),
});
type FormData = z.infer<typeof formSchema>;
import { applyForLeave } from "@/modules/leave/actions";
import type { LeaveTypeWithConfig } from "@/modules/leave/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employeeId: string;
  leaveTypes: LeaveTypeWithConfig[];
};

export function ApplyLeaveModal({ open, onClose, onSuccess, employeeId, leaveTypes }: Props) {
  const [workingDays, setWorkingDays] = useState<number | null>(null);
  const [loadingDays, setLoadingDays] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormData>({ resolver: zodResolver(formSchema) as any });

  const { watch, setValue, handleSubmit, register, formState: { errors, isSubmitting }, reset } = form;

  const startDateStr = watch("startDate");
  const endDateStr = watch("endDate");
  const startDate = startDateStr ? new Date(startDateStr) : null;
  const endDate = endDateStr ? new Date(endDateStr) : null;
  const leaveTypeId = watch("leaveTypeId");
  const isHalfDay = watch("isHalfDay");

  const selectedType = leaveTypes.find((t) => t.id === leaveTypeId);

  // Auto-calculate working days when dates change
  useEffect(() => {
    if (!startDate || !endDate) { setWorkingDays(null); return; }
    setLoadingDays(true);
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isHalfDay: String(isHalfDay),
    });
    fetch(`/api/leave/working-days?${params}`)
      .then((r) => r.json())
      .then((data) => setWorkingDays(data.days ?? null))
      .catch(() => setWorkingDays(null))
      .finally(() => setLoadingDays(false));
  }, [startDateStr, endDateStr, isHalfDay]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function onSubmit(data: any) {
    setSubmitError(null);
    const result = await applyForLeave({
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      attachments: [],
      employeeId,
    });
    if (!result.success) {
      setSubmitError(result.error ?? "Failed to submit leave request");
      return;
    }
    reset();
    onSuccess();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); setSubmitError(null); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Apply for Leave
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Leave Type */}
          <div className="space-y-1">
            <label className="text-sm font-medium">Leave Type *</label>
            <Select onValueChange={(v) => setValue("leaveTypeId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {!t.isPaid && " (Unpaid)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.leaveTypeId && <p className="text-xs text-destructive">{errors.leaveTypeId.message}</p>}
          </div>

          {/* Half Day Toggle */}
          {selectedType?.halfDayAllowed && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isHalfDay"
                {...register("isHalfDay")}
                className="h-4 w-4 rounded border-border"
              />
              <label htmlFor="isHalfDay" className="text-sm font-medium cursor-pointer">
                Half Day
              </label>
              {isHalfDay && (
                <Select onValueChange={(v) => setValue("halfDayPeriod", v as "MORNING" | "AFTERNOON")}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MORNING">Morning</SelectItem>
                    <SelectItem value="AFTERNOON">Afternoon</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Start Date *</label>
              <Input type="date" {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Date *</label>
              <Input type="date" {...register("endDate")} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>

          {/* Working Days Preview */}
          {startDate && endDate && (workingDays !== null || loadingDays) && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              {loadingDays ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <CalendarDays className="h-4 w-4 text-primary" />
              )}
              <span className="text-primary font-medium">
                {loadingDays ? "Calculating…" : `${workingDays} working day${workingDays !== 1 ? "s" : ""} (excl. weekends & holidays)`}
              </span>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Reason {selectedType?.requiresAttachment ? "(required)" : "(optional)"}
            </label>
            <Textarea {...register("reason")} placeholder="Brief reason for leave…" rows={2} />
          </div>

          {/* Attachment note */}
          {selectedType?.requiresAttachment && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <Paperclip className="h-3.5 w-3.5" />
              This leave type requires supporting documents. Upload via the document manager.
            </div>
          )}

          {/* Reliever note */}
          {selectedType?.requiresReliever && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <AlertCircle className="h-3.5 w-3.5" />
              This leave type requires a reliever. HR will assign one after submission.
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); setSubmitError(null); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
