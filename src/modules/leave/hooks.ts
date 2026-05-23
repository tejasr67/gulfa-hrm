"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { LeaveFilters } from "./types";

function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Leave Requests ───────────────────────────────────────────────────────────

export function useLeaveRequests(initialFilters: LeaveFilters = {}) {
  const [filters, setFilters] = useState<LeaveFilters>(initialFilters);
  const [data, setData] = useState<{ data: unknown[]; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(filters.search);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filters.status) params.set("status", filters.status);
      if (filters.leaveTypeId) params.set("leaveTypeId", filters.leaveTypeId);
      if (filters.employeeId) params.set("employeeId", filters.employeeId);
      if (filters.departmentId) params.set("departmentId", filters.departmentId);
      if (filters.startDate) params.set("startDate", filters.startDate.toISOString());
      if (filters.endDate) params.set("endDate", filters.endDate.toISOString());
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));

      const res = await window.fetch(`/api/leave/requests?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leave requests");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.leaveTypeId, filters.employeeId, filters.departmentId, filters.startDate, filters.endDate, filters.page, filters.limit]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, filters, setFilters, refetch: load };
}

// ─── Leave Balances ───────────────────────────────────────────────────────────

export function useLeaveBalances(employeeId: string, year: number) {
  const [balances, setBalances] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    fetch(`/api/leave/balances/${employeeId}?year=${year}`)
      .then((r) => r.json())
      .then(setBalances)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [employeeId, year]);

  return { balances, loading, error };
}

// ─── Leave Stats ──────────────────────────────────────────────────────────────

export function useLeaveStats() {
  const [stats, setStats] = useState<{
    pendingApprovals: number;
    onLeaveToday: number;
    approvedThisMonth: number;
    rejectedThisMonth: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leave/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}

// ─── Leave Calendar ───────────────────────────────────────────────────────────

export function useLeaveCalendar(from: Date, to: Date, departmentId?: string) {
  const [entries, setEntries] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      ...(departmentId && { departmentId }),
    });
    fetch(`/api/leave/calendar?${params}`)
      .then((r) => r.json())
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [from.toISOString(), to.toISOString(), departmentId]);

  return { entries, loading, error };
}

// ─── Pending Approvals ────────────────────────────────────────────────────────

export function usePendingApprovals() {
  const [requests, setRequests] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/leave/approvals/pending")
      .then((r) => r.json())
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return { requests, loading, refetch: load };
}

// ─── Leave Types ──────────────────────────────────────────────────────────────

export function useLeaveTypes() {
  const [types, setTypes] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leave/types")
      .then((r) => r.json())
      .then(setTypes)
      .finally(() => setLoading(false));
  }, []);

  return { types, loading };
}
