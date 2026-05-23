"use client";

import { useState, useEffect, useCallback } from "react";

async function postJson<T = unknown>(url: string, body: unknown): Promise<{ data: T | null; error: string | null; success: boolean }> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

export type CareerStats = {
  total: number;
  recent: number;
  promotions: number;
  transfers: number;
  salaryRevisions: number;
};

export type CareerEventItem = {
  id: string;
  type: string;
  effectiveDate: string;
  fromPosition: string | null;
  toPosition: string | null;
  fromDepartment: string | null;
  toDepartment: string | null;
  fromManagerId: string | null;
  toManagerId: string | null;
  fromLocationId: string | null;
  toLocationId: string | null;
  fromSalary: number | null;
  toSalary: number | null;
  reason: string | null;
  notes: string | null;
  approvedBy: string | null;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: { name: string } | null;
  };
};

export type EmployeeCareerEvent = {
  id: string;
  type: string;
  effectiveDate: string;
  fromPosition: string | null;
  toPosition: string | null;
  fromDepartment: string | null;
  toDepartment: string | null;
  fromManagerId: string | null;
  toManagerId: string | null;
  fromLocationId: string | null;
  toLocationId: string | null;
  fromSalary: number | null;
  toSalary: number | null;
  reason: string | null;
  notes: string | null;
  approvedBy: string | null;
  createdAt: string;
};

export function useCareerStats() {
  const [data, setData] = useState<CareerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/career/stats", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

export function useRecentCareerEvents() {
  const [data, setData] = useState<CareerEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/career", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

export function useEmployeeCareerHistory(employeeId: string) {
  const [data, setData] = useState<EmployeeCareerEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!employeeId) return;
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch(`/api/career/employee/${employeeId}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data.events ?? []); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [employeeId, tick]);

  return { data, isLoading, refetch };
}

export function useCreateCareerEvent() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/career", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}
