"use client";

import { useState, useEffect, useCallback } from "react";
import type { EmployeeListItem, TimelineEvent, EmployeeDocumentWithType } from "./types";
import type { PaginatedResponse } from "@/types";
import type { AdvancedEmployeeQueryParams } from "@/lib/api/query-params";

// ── Generic fetcher ────────────────────────────────────────────────────────────

function useFetch<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) { setData(j.data); setError(null); }
        else setError(j.error ?? "Request failed");
      })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [url, tick]);

  return { data, isLoading, error, refetch };
}

const SEARCH_DEBOUNCE_MS = 300;

// ── useEmployees ──────────────────────────────────────────────────────────

type UseEmployeesParams = Partial<AdvancedEmployeeQueryParams>;

export function useEmployees(params: UseEmployeesParams = {}) {
  const [data, setData] = useState<PaginatedResponse<EmployeeListItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(params.search);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(params.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [params.search]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    const query = new URLSearchParams();
    if (debouncedSearch) query.set("search", debouncedSearch);
    if (params.departmentId) query.set("departmentId", params.departmentId);
    if (params.status) query.set("status", params.status);
    if (params.employmentType) query.set("employmentType", params.employmentType);
    if (params.locationId) query.set("locationId", params.locationId);
    if (params.nationality) query.set("nationality", params.nationality);
    if (params.expiryStatus) query.set("expiryStatus", params.expiryStatus);
    if (params.includeArchived) query.set("includeArchived", "true");
    if (params.sortBy) query.set("sortBy", params.sortBy);
    if (params.sortOrder) query.set("sortOrder", params.sortOrder);
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));

    fetch(`/api/employees?${query}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) { setData(json.data); setError(null); }
        else setError(json.error ?? "Unknown error");
      })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [
    debouncedSearch, params.departmentId, params.status, params.employmentType,
    params.locationId, params.nationality, params.expiryStatus, params.includeArchived,
    params.sortBy, params.sortOrder, params.page, params.limit, tick,
  ]);

  return { data, isLoading, error, refetch };
}

// ── useEmployeeTimeline ────────────────────────────────────────────────────

export function useEmployeeTimeline(employeeId: string) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/employees/${employeeId}/timeline`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) { setEvents(json.data); setError(null); }
        else setError(json.error ?? "Unknown error");
      })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [employeeId]);

  return { events, isLoading, error };
}

// ── useEmployeeDocuments ───────────────────────────────────────────────────

export function useEmployeeDocuments(employeeId: string) {
  const [documents, setDocuments] = useState<EmployeeDocumentWithType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!employeeId) return;
    const controller = new AbortController();
    setIsLoading(true);

    fetch(`/api/employees/${employeeId}/documents`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) { setDocuments(json.data); setError(null); }
        else setError(json.error ?? "Unknown error");
      })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [employeeId, tick]);

  return { documents, isLoading, error, refetch };
}

// ── Employee profile tab hooks ─────────────────────────────────────────────────

export type EmployeeLeaveEntry = {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string | null;
  isHalfDay: boolean;
  approvedAt: string | null;
  createdAt: string;
  leaveType: { id: string; name: string; code: string; isPaid: boolean };
};

export function useEmployeeLeave(employeeId: string) {
  const url = employeeId ? `/api/leave/requests?employeeId=${employeeId}&limit=50` : null;
  const { data, isLoading, error, refetch } = useFetch<{ data: EmployeeLeaveEntry[]; total: number }>(url);
  return { data: data?.data ?? [], total: data?.total ?? 0, isLoading, error, refetch };
}

export type AttendanceEntry = {
  id: string;
  date: string;
  status: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: number | null;
  overtime: number | null;
  checkInMethod: string | null;
  notes: string | null;
};

export function useEmployeeAttendance(employeeId: string, filters?: { year?: number; month?: number; page?: number }) {
  const params = new URLSearchParams({ limit: "50" });
  if (filters?.year) params.set("year", String(filters.year));
  if (filters?.month) params.set("month", String(filters.month));
  if (filters?.page) params.set("page", String(filters.page));
  const url = employeeId ? `/api/employees/${employeeId}/attendance?${params}` : null;
  const { data, isLoading, error, refetch } = useFetch<{ data: AttendanceEntry[]; total: number; totalPages: number }>(url);
  return { data: data?.data ?? [], total: data?.total ?? 0, totalPages: data?.totalPages ?? 0, isLoading, error, refetch };
}

export type PayslipEntry = {
  id: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  mobileAllowance: number;
  otherAllowances: number;
  overtime: number;
  grossSalary: number;
  deductions: number;
  unpaidLeaveDeduction: number;
  advanceDeduction: number;
  netSalary: number;
  workingDays: number;
  paidDays: number;
  status: string;
  paidAt: string | null;
  payrollRun: { id: string; month: number; year: number; status: string; currency: string };
};

export function useEmployeePayslips(employeeId: string) {
  const url = employeeId ? `/api/employees/${employeeId}/payslips` : null;
  const { data, isLoading, error, refetch } = useFetch<{ data: PayslipEntry[]; total: number }>(url);
  return { data: data?.data ?? [], total: data?.total ?? 0, isLoading, error, refetch };
}

export type EmployeeAssetEntry = {
  id: string;
  assignedAt: string;
  returnedAt: string | null;
  expectedReturnDate: string | null;
  condition: string;
  returnCondition: string | null;
  notes: string | null;
  asset: {
    id: string;
    name: string;
    code: string;
    serialNumber: string | null;
    status: string;
    category: { name: string; icon: string | null };
  };
};

export function useEmployeeAssets(employeeId: string) {
  const url = employeeId ? `/api/assets/assignments?employeeId=${employeeId}` : null;
  const { data, isLoading, error, refetch } = useFetch<EmployeeAssetEntry[]>(url);
  return { data: data ?? [], isLoading, error, refetch };
}

export type DisciplinaryEntry = {
  id: string;
  incidentDate: string;
  description: string;
  action: string | null;
  status: string;
  appealNote: string | null;
  createdAt: string;
  disciplinaryType: { id: string; name: string; severity: string };
};

export function useEmployeeDisciplinary(employeeId: string) {
  const url = employeeId ? `/api/disciplinary?employeeId=${employeeId}` : null;
  const { data, isLoading, error, refetch } = useFetch<DisciplinaryEntry[]>(url);
  return { data: data ?? [], isLoading, error, refetch };
}
