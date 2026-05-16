"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ComplianceStat, ComplianceByDocType, ComplianceByDepartment,
  ExpiryForecastPoint, DocumentExpiryItem,
} from "./types";

// ── useComplianceStats ────────────────────────────────────────────────────────

export function useComplianceStats() {
  const [data, setData] = useState<ComplianceStat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetch("/api/compliance/dashboard", { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) { setData(json.data); setError(null); }
        else setError(json.error ?? "Unknown error");
      })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [tick]);

  return { data, isLoading, error, refetch };
}

// ── useExpiringDocuments ──────────────────────────────────────────────────────

type ExpiringFilter = {
  risk?: "expired" | "critical" | "warning" | "ok";
  departmentId?: string;
  documentTypeId?: string;
  page?: number;
};

export function useExpiringDocuments(filter: ExpiringFilter = {}) {
  const [items, setItems] = useState<DocumentExpiryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    const q = new URLSearchParams();
    if (filter.risk) q.set("risk", filter.risk);
    if (filter.departmentId) q.set("departmentId", filter.departmentId);
    if (filter.documentTypeId) q.set("documentTypeId", filter.documentTypeId);
    if (filter.page) q.set("page", String(filter.page));

    fetch(`/api/compliance/expiring?${q}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) { setItems(json.data.items); setTotal(json.data.total); setError(null); }
        else setError(json.error ?? "Unknown error");
      })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [filter.risk, filter.departmentId, filter.documentTypeId, filter.page, tick]);

  return { items, total, isLoading, error, refetch };
}

// ── useComplianceAnalytics ────────────────────────────────────────────────────

type AnalyticsData = {
  byDocType: ComplianceByDocType[];
  byDepartment: ComplianceByDepartment[];
  forecast: ExpiryForecastPoint[];
};

export function useComplianceAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    fetch("/api/compliance/analytics", { signal: controller.signal })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) { setData(json.data); setError(null); }
        else setError(json.error ?? "Unknown error");
      })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  return { data, isLoading, error };
}
