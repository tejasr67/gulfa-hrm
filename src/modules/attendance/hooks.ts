"use client";

import { useState, useEffect, useCallback } from "react";
import type { AttendanceFilters } from "./types";

function useDebounce<T>(value: T, delay = 350): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useAttendanceRecords(initialFilters: AttendanceFilters = {}) {
  const [filters, setFilters] = useState<AttendanceFilters>(initialFilters);
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
      if (filters.employeeId) params.set("employeeId", filters.employeeId);
      if (filters.departmentId) params.set("departmentId", filters.departmentId);
      if (filters.shiftId) params.set("shiftId", filters.shiftId);
      if (filters.startDate) params.set("startDate", filters.startDate.toISOString());
      if (filters.endDate) params.set("endDate", filters.endDate.toISOString());
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));

      const res = await fetch(`/api/attendance?${params}`);
      if (!res.ok) throw new Error("Failed to fetch attendance records");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.employeeId, filters.departmentId, filters.shiftId, filters.startDate, filters.endDate, filters.page, filters.limit]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, filters, setFilters, refetch: load };
}

export function useAttendanceStats() {
  const [stats, setStats] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/attendance/stats");
      if (!res.ok) throw new Error("Failed to fetch attendance stats");
      const json = await res.json();
      setStats(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { stats, loading, error, refetch: load };
}

export function useShifts() {
  const [shifts, setShifts] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attendance/shifts")
      .then((r) => r.json())
      .then(setShifts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { shifts, loading };
}
