"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AssetStats,
  AssetCategoryBreakdown,
  MaintenanceAlertItem,
} from "./types";

function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return fetch(url, { signal })
    .then((r) => r.json())
    .then((j) => {
      if (j.success === false) throw new Error(j.error ?? "Request failed");
      return j.data as T;
    });
}

async function postJson<T = unknown>(url: string, body: unknown): Promise<{ data: T | null; error: string | null; success: boolean }> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

async function patchJson<T = unknown>(url: string, body: unknown): Promise<{ data: T | null; error: string | null; success: boolean }> {
  const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

async function deleteJson<T = unknown>(url: string): Promise<{ data: T | null; error: string | null; success: boolean }> {
  const r = await fetch(url, { method: "DELETE" });
  return r.json();
}

function useApiList<T>(url: string, params?: Record<string, string | undefined>) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const fullUrl = params
    ? url + "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v != null) as [string, string][])).toString()
    : url;

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetchJson<T[]>(fullUrl, ctrl.signal)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullUrl, tick]);

  return { data, isLoading, error, refetch };
}

function useApiOne<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!!url);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    setIsLoading(true);
    fetchJson<T>(url, ctrl.signal)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [url, tick]);

  return { data, isLoading, error, refetch };
}

// ── Asset types ───────────────────────────────────────────────────────────────

export type AssetCategoryItem = {
  id: string;
  name: string;
  nameAr: string | null;
  icon: string | null;
  isActive: boolean;
  _count: { assets: number };
};

export type AssetListEntry = {
  id: string;
  name: string;
  code: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  status: string;
  condition: string;
  location: string | null;
  purchasePrice: number | null;
  currentValue: number | null;
  warrantyExpiry: string | null;
  replacementCycleMonths: number | null;
  nextMaintenanceAt: string | null;
  lastMaintenanceAt: string | null;
  purchaseDate: string | null;
  category: { id: string; name: string; icon: string | null };
  assignments: {
    id: string;
    employee: { id: string; firstName: string; lastName: string; employeeId: string } | null;
  }[];
  _count: { assignments: number; maintenanceLogs: number };
};

export type AssetDetailData = {
  id: string;
  name: string;
  code: string;
  serialNumber: string | null;
  brand: string | null;
  model: string | null;
  status: string;
  condition: string;
  location: string | null;
  notes: string | null;
  purchasePrice: number | null;
  currentValue: number | null;
  depreciationRate: number | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  replacementCycleMonths: number | null;
  lastMaintenanceAt: string | null;
  nextMaintenanceAt: string | null;
  imageUrl: string | null;
  category: { id: string; name: string; nameAr: string | null; icon: string | null; isActive: boolean };
  assignments: {
    id: string;
    assignedAt: string;
    returnedAt: string | null;
    expectedReturnDate: string | null;
    condition: string;
    returnCondition: string | null;
    notes: string | null;
    returnNotes: string | null;
    employee: {
      id: string;
      firstName: string;
      lastName: string;
      employeeId: string;
      department: { name: string } | null;
    } | null;
  }[];
  maintenanceLogs: {
    id: string;
    type: string;
    status: string;
    scheduledAt: string;
    completedAt: string | null;
    cost: number | null;
    vendor: string | null;
    description: string | null;
    outcome: string | null;
  }[];
};

export type ActiveAssignmentEntry = {
  id: string;
  assignedAt: string;
  expectedReturnDate: string | null;
  condition: string;
  notes: string | null;
  employee: { id: string; firstName: string; lastName: string; employeeId: string; department?: { name: string } | null };
  asset: { id: string; name: string; code: string; category: { name: string } };
};

export type MaintenanceLogEntry = {
  id: string;
  type: string;
  status: string;
  scheduledAt: string;
  completedAt: string | null;
  cost: number | null;
  vendor: string | null;
  description: string | null;
  outcome: string | null;
  asset: { id: string; name: string; code: string; category: { name: string } };
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAssetCategories() {
  return useApiList<AssetCategoryItem>("/api/assets/categories");
}

export function useAssets(filters?: { categoryId?: string; status?: string; search?: string }) {
  return useApiList<AssetListEntry>("/api/assets", filters as Record<string, string | undefined>);
}

export function useAsset(id: string | null) {
  return useApiOne<AssetDetailData>(id ? `/api/assets/${id}` : null);
}

export function useActiveAssignments() {
  return useApiList<ActiveAssignmentEntry>("/api/assets/assignments");
}

export function useMaintenanceLogs(filters?: { status?: string; assetId?: string }) {
  return useApiList<MaintenanceLogEntry>("/api/assets/maintenance", filters as Record<string, string | undefined>);
}

export function useMaintenanceAlerts() {
  return useApiList<MaintenanceAlertItem>("/api/assets/maintenance?alerts=1" as unknown as string);
}

type ReportsData = { stats: AssetStats; categoryBreakdown: AssetCategoryBreakdown[] };
export function useAssetReports() {
  return useApiOne<ReportsData>("/api/assets/reports");
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useCreateAsset() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/assets", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

export function useUpdateAsset(id: string | null) {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    if (!id) return null;
    setIsMutating(true);
    try { return await patchJson(`/api/assets/${id}`, body); }
    finally { setIsMutating(false); }
  }, [id]);
  return { trigger, isMutating };
}

export function useDeleteAsset(id: string | null) {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async () => {
    if (!id) return null;
    setIsMutating(true);
    try { return await deleteJson(`/api/assets/${id}`); }
    finally { setIsMutating(false); }
  }, [id]);
  return { trigger, isMutating };
}

export function useAssetAssignmentMutation() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/assets/assignments", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

export function useMaintenanceMutation() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/assets/maintenance", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}
