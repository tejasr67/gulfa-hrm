"use client";

import { useState, useEffect, useCallback } from "react";

async function postJson<T = unknown>(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json() as Promise<{ success: boolean; data: T | null; error?: string }>;
}
async function patchJson<T = unknown>(url: string, body: unknown) {
  const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json() as Promise<{ success: boolean; data: T | null; error?: string }>;
}

export type StockItem = {
  id: string;
  category: string;
  size: string;
  color: string;
  location: string;
  qty: number;
  minStock: number;
  updatedAt: string;
};

export type UniformStats = {
  totalItems: number;
  lowStock: number;
  outOfStock: number;
  skuCount: number;
};

export type IssuanceItem = {
  id: string;
  category: string;
  size: string;
  color: string;
  location: string;
  qty: number;
  issuedAt: string;
  notes: string | null;
  returnedAt: string | null;
  returnNotes: string | null;
  employee: { id: string; firstName: string; lastName: string; employeeId: string };
};

// ── Stock ──────────────────────────────────────────────────────────────────

export function useUniformStock() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stats, setStats] = useState<UniformStats>({ totalItems: 0, lowStock: 0, outOfStock: 0, skuCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/uniforms/stock", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) { setStock(j.data.stock); setStats(j.data.stats); } })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { stock, stats, isLoading, refetch };
}

export function useUpdateStock() {
  const [isMutating, setIsMutating] = useState(false);
  const updateQty = useCallback(async (id: string, qty: number) => {
    setIsMutating(true);
    try { return await patchJson("/api/uniforms/stock", { id, qty }); }
    finally { setIsMutating(false); }
  }, []);
  const addItem = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/uniforms/stock", body); }
    finally { setIsMutating(false); }
  }, []);
  const deleteItem = useCallback(async (id: string) => {
    setIsMutating(true);
    try {
      const r = await fetch(`/api/uniforms/stock?id=${id}`, { method: "DELETE" });
      return r.json();
    } finally { setIsMutating(false); }
  }, []);
  return { updateQty, addItem, deleteItem, isMutating };
}

// ── Issuance ───────────────────────────────────────────────────────────────

export function useIssuances(filters?: { category?: string }) {
  const [data, setData] = useState<IssuanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    const qs = filters?.category ? `?category=${filters.category}` : "";
    fetch(`/api/uniforms/issuance${qs}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick, filters?.category]);

  return { data, isLoading, refetch };
}

export function useIssuanceMutation() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/uniforms/issuance", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

// ── Bulk ───────────────────────────────────────────────────────────────────

export function useBulkUniform() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (rows: unknown[]) => {
    setIsMutating(true);
    try {
      return await postJson<{ results: unknown[]; succeeded: number; failed: number }>(
        "/api/uniforms/bulk",
        { rows }
      );
    } finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

// ── Master file sync ───────────────────────────────────────────────────────

export type SyncPreviewRow = {
  category: string;
  size: string;
  color: string;
  location: string;
  oldQty: number | null;
  newQty: number;
  minStock: number;
  changed: boolean;
};

export type SyncResult = {
  upserted: number;
  unchanged: number;
  errors: string[];
  preview: SyncPreviewRow[];
};

export function useSyncMasterFile() {
  const [isMutating, setIsMutating] = useState(false);
  const preview = useCallback(async (sheets: Record<string, unknown[][]>) => {
    setIsMutating(true);
    try { return await postJson<{ preview: SyncPreviewRow[]; warnings: string[]; parseCount: number }>("/api/uniforms/sync/preview", { sheets }); }
    finally { setIsMutating(false); }
  }, []);
  const sync = useCallback(async (sheets: Record<string, unknown[][]>) => {
    setIsMutating(true);
    try { return await postJson<SyncResult>("/api/uniforms/sync", { sheets }); }
    finally { setIsMutating(false); }
  }, []);
  return { preview, sync, isMutating };
}
