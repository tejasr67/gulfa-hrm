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

export type BenefitTypeItem = {
  id: string;
  name: string;
  nameAr: string | null;
  description: string | null;
  isActive: boolean;
  _count: { employeeBenefits: number };
};

export type BenefitStats = {
  types: number;
  activeCount: number;
  totalValue: number;
};

export type EmployeeBenefitItem = {
  id: string;
  value: number | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: { name: string } | null;
  };
  benefitType: { id: string; name: string };
};

export function useBenefitTypes() {
  const [data, setData] = useState<BenefitTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/benefits/types", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

export function useBenefitStats() {
  const [data, setData] = useState<BenefitStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/benefits/stats", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

type BenefitFilters = { typeId?: string; isActive?: boolean };

export function useEmployeeBenefits(filters: BenefitFilters = {}) {
  const [data, setData] = useState<EmployeeBenefitItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  const qs = new URLSearchParams();
  if (filters.typeId) qs.set("typeId", filters.typeId);
  if (filters.isActive !== undefined) qs.set("isActive", String(filters.isActive));
  const url = "/api/benefits?" + qs.toString();

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

export function useAssignBenefit() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/benefits", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

export function useTerminateBenefit(id: string | null) {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async () => {
    if (!id) return null;
    setIsMutating(true);
    try { return await patchJson(`/api/benefits/${id}`, { isActive: false }); }
    finally { setIsMutating(false); }
  }, [id]);
  return { trigger, isMutating };
}

export function useCreateBenefitType() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/benefits/types", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}
