"use client";

import { useState, useEffect, useCallback } from "react";
import type { EmployeeListItem, TimelineEvent, EmployeeDocumentWithType } from "./types";
import type { PaginatedResponse } from "@/types";
import type { AdvancedEmployeeQueryParams } from "@/lib/api/query-params";

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
