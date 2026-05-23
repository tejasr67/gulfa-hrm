"use client";

import { useState, useEffect, useCallback } from "react";

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

export type DocumentTypeItem = {
  id: string;
  name: string;
  nameAr: string | null;
  requiresExpiry: boolean;
  alertDaysBefore: number;
  isActive: boolean;
};

export type DocumentStats = {
  total: number;
  expired: number;
  expiring30: number;
  expiring60: number;
  valid: number;
  noExpiry: number;
};

export type DocumentListItem = {
  id: string;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  issuedBy: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  documentType: { id: string; name: string; requiresExpiry: boolean };
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: { name: string } | null;
  };
};

type DocumentFilters = {
  employeeId?: string;
  documentTypeId?: string;
  status?: string;
  expiry?: string;
  search?: string;
  page?: number;
};

export function useDocumentTypes() {
  const [data, setData] = useState<DocumentTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/documents/types", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

export function useDocumentStats() {
  const [data, setData] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/documents/stats", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

export function useDocuments(filters: DocumentFilters = {}) {
  const [items, setItems] = useState<DocumentListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const qs = new URLSearchParams();
  if (filters.employeeId) qs.set("employeeId", filters.employeeId);
  if (filters.documentTypeId) qs.set("documentTypeId", filters.documentTypeId);
  if (filters.status) qs.set("status", filters.status);
  if (filters.expiry) qs.set("expiry", filters.expiry);
  if (filters.search) qs.set("search", filters.search);
  if (filters.page) qs.set("page", String(filters.page));
  const url = "/api/documents?" + qs.toString();

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        if (j.success) { setItems(j.data.items); setTotal(j.data.total); }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick]);

  return { items, total, isLoading, refetch };
}

export function useCreateDocument() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/documents", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

export function useUpdateDocument(id: string | null) {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    if (!id) return null;
    setIsMutating(true);
    try { return await patchJson(`/api/documents/${id}`, body); }
    finally { setIsMutating(false); }
  }, [id]);
  return { trigger, isMutating };
}

export function useDeleteDocument(id: string | null) {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async () => {
    if (!id) return null;
    setIsMutating(true);
    try { return await deleteJson(`/api/documents/${id}`); }
    finally { setIsMutating(false); }
  }, [id]);
  return { trigger, isMutating };
}
