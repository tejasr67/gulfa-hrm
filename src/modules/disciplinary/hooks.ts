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

export type DisciplinaryTypeItem = {
  id: string;
  name: string;
  severity: string;
  isActive: boolean;
  _count: { records: number };
};

export type DisciplinaryStats = {
  total: number;
  open: number;
  closed: number;
  appealed: number;
  terminations: number; // critical severity count
};

export type DisciplinaryRecordItem = {
  id: string;
  incidentDate: string;
  description: string;
  action: string;
  actionDate: string | null;
  status: string;
  appealStatus: string | null;
  appealReason: string | null;
  issuedBy: string | null;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: { name: string } | null;
  };
  disciplinaryType: { id: string; name: string; severity: string };
};

export function useDisciplinaryTypes(companyId?: string) {
  const [data, setData] = useState<DisciplinaryTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/disciplinary/types", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

export function useDisciplinaryStats() {
  const [data, setData] = useState<DisciplinaryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/disciplinary/stats", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

type RecordFilters = { status?: string; typeId?: string; search?: string };

export function useDisciplinaryRecords(filters: RecordFilters = {}) {
  const [data, setData] = useState<DisciplinaryRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const qs = new URLSearchParams();
  if (filters.status) qs.set("status", filters.status);
  if (filters.typeId) qs.set("typeId", filters.typeId);
  if (filters.search) qs.set("search", filters.search);
  const url = "/api/disciplinary?" + qs.toString();

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch(url, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick]);

  return { data, isLoading, refetch };
}

export function useCreateDisciplinaryRecord() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/disciplinary", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

export function useUpdateDisciplinaryRecord(id: string | null) {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    if (!id) return null;
    setIsMutating(true);
    try { return await patchJson(`/api/disciplinary/${id}`, body); }
    finally { setIsMutating(false); }
  }, [id]);
  return { trigger, isMutating };
}
