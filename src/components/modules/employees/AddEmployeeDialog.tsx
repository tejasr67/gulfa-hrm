"use client";

import { useState, useEffect } from "react";
import { Loader2, UserPlus, AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ── Reference data types ──────────────────────────────────────────────────────

type RefData = {
  departments: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  positions: { id: string; title: string; departmentId: string | null }[];
  managers: { id: string; firstName: string; lastName: string; employeeId: string }[];
};

// ── Form state ────────────────────────────────────────────────────────────────

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentType: string;
  joiningDate: string;
  departmentId: string;
  positionId: string;
  locationId: string;
  managerId: string;
  nationality: string;
  gender: string;
  maritalStatus: string;
  dateOfBirth: string;
  emiratesId: string;
  emiratesIdExpiry: string;
  visaNumber: string;
  visaExpiry: string;
  passportNumber: string;
  passportExpiry: string;
  laborCardNumber: string;
  laborCardExpiry: string;
  bankName: string;
  bankAccount: string;
  iban: string;
};

const EMPTY_FORM: FormState = {
  firstName: "", lastName: "", email: "", phone: "",
  employmentType: "FULL_TIME", joiningDate: "",
  departmentId: "", positionId: "", locationId: "", managerId: "",
  nationality: "", gender: "", maritalStatus: "", dateOfBirth: "",
  emiratesId: "", emiratesIdExpiry: "", visaNumber: "", visaExpiry: "",
  passportNumber: "", passportExpiry: "", laborCardNumber: "", laborCardExpiry: "",
  bankName: "", bankAccount: "", iban: "",
};

// ── Field group component ─────────────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {!required && <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2 pb-0.5 border-b">
      {children}
    </h3>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddEmployeeDialog({ open, onOpenChange, onSuccess }: AddEmployeeDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [refData, setRefData] = useState<RefData | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Load reference data when dialog opens
  useEffect(() => {
    if (!open) return;
    setRefLoading(true);
    fetch("/api/employees/ref-data")
      .then((r) => r.json())
      .then((j) => { if (j.success) setRefData(j.data); })
      .catch(() => {})
      .finally(() => setRefLoading(false));
  }, [open]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Reset position when department changes
      if (field === "departmentId") next.positionId = "";
      return next;
    });
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) errs.firstName = "Required";
    if (!form.lastName.trim()) errs.lastName = "Required";
    if (!form.email.trim()) errs.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    if (!form.joiningDate) errs.joiningDate = "Required";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setError(null);

    const payload: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      employmentType: form.employmentType,
      joiningDate: form.joiningDate,
    };
    if (form.phone) payload.phone = form.phone;
    if (form.departmentId) payload.departmentId = form.departmentId;
    if (form.positionId) payload.positionId = form.positionId;
    if (form.locationId) payload.locationId = form.locationId;
    if (form.managerId) payload.managerId = form.managerId;
    if (form.nationality) payload.nationality = form.nationality;
    if (form.gender) payload.gender = form.gender;
    if (form.maritalStatus) payload.maritalStatus = form.maritalStatus;
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    if (form.emiratesId) payload.emiratesId = form.emiratesId;
    if (form.emiratesIdExpiry) payload.emiratesIdExpiry = form.emiratesIdExpiry;
    if (form.visaNumber) payload.visaNumber = form.visaNumber;
    if (form.visaExpiry) payload.visaExpiry = form.visaExpiry;
    if (form.passportNumber) payload.passportNumber = form.passportNumber;
    if (form.passportExpiry) payload.passportExpiry = form.passportExpiry;
    if (form.laborCardNumber) payload.laborCardNumber = form.laborCardNumber;
    if (form.laborCardExpiry) payload.laborCardExpiry = form.laborCardExpiry;
    if (form.bankName) payload.bankName = form.bankName;
    if (form.bankAccount) payload.bankAccount = form.bankAccount;
    if (form.iban) payload.iban = form.iban;

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Failed to create employee");
        return;
      }
      onSuccess();
      onOpenChange(false);
      setForm(EMPTY_FORM);
      setFieldErrors({});
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    onOpenChange(false);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setError(null);
  }

  // Filter positions by selected department
  const filteredPositions = refData?.positions.filter(
    (p) => !form.departmentId || p.departmentId === form.departmentId || !p.departmentId
  ) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Employee
          </DialogTitle>
          <DialogDescription>
            Fill in the employee details. Only the starred fields are required.
          </DialogDescription>
        </DialogHeader>

        {refLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* ── Basic Info ── */}
            <SectionTitle>Basic Information</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" required>
                <Input
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  placeholder="Ahmed"
                  className={fieldErrors.firstName ? "border-destructive" : ""}
                />
                {fieldErrors.firstName && <p className="text-xs text-destructive mt-1">{fieldErrors.firstName}</p>}
              </Field>
              <Field label="Last Name" required>
                <Input
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  placeholder="Al Mansouri"
                  className={fieldErrors.lastName ? "border-destructive" : ""}
                />
                {fieldErrors.lastName && <p className="text-xs text-destructive mt-1">{fieldErrors.lastName}</p>}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="ahmed@company.com"
                  className={fieldErrors.email ? "border-destructive" : ""}
                />
                {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+971501234567"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nationality">
                <Input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} placeholder="UAE" />
              </Field>
              <Field label="Date of Birth">
                <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Gender">
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Marital Status">
                <Select value={form.maritalStatus} onValueChange={(v) => set("maritalStatus", v)}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE">Single</SelectItem>
                    <SelectItem value="MARRIED">Married</SelectItem>
                    <SelectItem value="DIVORCED">Divorced</SelectItem>
                    <SelectItem value="WIDOWED">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* ── Employment ── */}
            <SectionTitle>Employment Details</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Employment Type" required>
                <Select value={form.employmentType} onValueChange={(v) => set("employmentType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                    <SelectItem value="FREELANCE">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Joining Date" required>
                <Input
                  type="date"
                  value={form.joiningDate}
                  onChange={(e) => set("joiningDate", e.target.value)}
                  className={fieldErrors.joiningDate ? "border-destructive" : ""}
                />
                {fieldErrors.joiningDate && <p className="text-xs text-destructive mt-1">{fieldErrors.joiningDate}</p>}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Department">
                <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {(refData?.departments ?? []).length === 0 ? (
                      <SelectItem value="__none__" disabled>No departments yet</SelectItem>
                    ) : (
                      refData!.departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Position">
                <Select value={form.positionId} onValueChange={(v) => set("positionId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    {filteredPositions.length === 0 ? (
                      <SelectItem value="__none__" disabled>No positions yet</SelectItem>
                    ) : (
                      filteredPositions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Location">
                <Select value={form.locationId} onValueChange={(v) => set("locationId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {(refData?.locations ?? []).length === 0 ? (
                      <SelectItem value="__none__" disabled>No locations yet</SelectItem>
                    ) : (
                      refData!.locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Manager">
                <Select value={form.managerId} onValueChange={(v) => set("managerId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger>
                  <SelectContent>
                    {(refData?.managers ?? []).length === 0 ? (
                      <SelectItem value="__none__" disabled>No employees yet</SelectItem>
                    ) : (
                      refData!.managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}
                          <span className="text-muted-foreground ml-1">· {m.employeeId}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* ── UAE Documents ── */}
            <SectionTitle>UAE Documents</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Emirates ID">
                <Input value={form.emiratesId} onChange={(e) => set("emiratesId", e.target.value)} placeholder="784-1990-1234567-1" />
              </Field>
              <Field label="Emirates ID Expiry">
                <Input type="date" value={form.emiratesIdExpiry} onChange={(e) => set("emiratesIdExpiry", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Visa Number">
                <Input value={form.visaNumber} onChange={(e) => set("visaNumber", e.target.value)} placeholder="202/2024/1234567" />
              </Field>
              <Field label="Visa Expiry">
                <Input type="date" value={form.visaExpiry} onChange={(e) => set("visaExpiry", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Passport Number">
                <Input value={form.passportNumber} onChange={(e) => set("passportNumber", e.target.value)} placeholder="A12345678" />
              </Field>
              <Field label="Passport Expiry">
                <Input type="date" value={form.passportExpiry} onChange={(e) => set("passportExpiry", e.target.value)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Labour Card Number">
                <Input value={form.laborCardNumber} onChange={(e) => set("laborCardNumber", e.target.value)} placeholder="LC-2024-123456" />
              </Field>
              <Field label="Labour Card Expiry">
                <Input type="date" value={form.laborCardExpiry} onChange={(e) => set("laborCardExpiry", e.target.value)} />
              </Field>
            </div>

            {/* ── Banking ── */}
            <SectionTitle>Banking Information</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bank Name">
                <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} placeholder="Emirates NBD" />
              </Field>
              <Field label="Bank Account">
                <Input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} placeholder="1234567890123456" />
              </Field>
            </div>
            <Field label="IBAN">
              <Input value={form.iban} onChange={(e) => set("iban", e.target.value)} placeholder="AE070331234567890123456" />
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || refLoading}>
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <>Add Employee</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
