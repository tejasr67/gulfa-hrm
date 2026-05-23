"use client";

import { useState, useEffect, useCallback } from "react";
import type { PayrollStats, PayrollSummaryReport } from "./types";

function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return fetch(url, { signal })
    .then((r) => r.json())
    .then((j) => {
      if (j.success === false) throw new Error(j.error ?? "Request failed");
      return j.data as T;
    });
}

async function postJson<T>(url: string, body: unknown): Promise<{ data: T | null; error: string | null; success: boolean }> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ── Generic list hook ─────────────────────────────────────────────────────────

function useApiList<T>(url: string) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetchJson<T[]>(url, ctrl.signal)
      .then((d) => { setData(d); setError(null); })
      .catch((e) => { if (e.name !== "AbortError") setError(e.message); })
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [url, tick]);

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

// ── Types (minimal shapes for UI) ────────────────────────────────────────────

export type PayrollRunListItem = {
  id: string;
  month: number;
  year: number;
  status: string;
  totalAmount: number | null;
  processedAt: string | null;
  currency: string;
  _count: { payslips: number };
};

// ── Payroll Runs ──────────────────────────────────────────────────────────────

export function usePayrollRuns() {
  return useApiList<PayrollRunListItem>("/api/payroll/runs");
}

export function usePayrollRun(id: string | null) {
  return useApiOne<Record<string, unknown>>(id ? `/api/payroll/runs/${id}` : null);
}

export function useCreatePayrollRun() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/payroll/runs", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

export function usePayrollRunAction(id: string | null) {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    if (!id) return null;
    setIsMutating(true);
    try { return await postJson(`/api/payroll/runs/${id}`, body); }
    finally { setIsMutating(false); }
  }, [id]);
  return { trigger, isMutating };
}

// ── Payslip ───────────────────────────────────────────────────────────────────

export function usePayslip(id: string | null) {
  return useApiOne<Record<string, unknown>>(id ? `/api/payroll/payslips/${id}` : null);
}

// ── Salary Components ─────────────────────────────────────────────────────────

export type SalaryComponentItem = {
  id: string;
  name: string;
  nameAr: string | null;
  type: string;
  calculationType: string;
  isActive: boolean;
};

export function useSalaryComponents() {
  return useApiList<SalaryComponentItem>("/api/payroll/salary-components");
}

export function useCreateSalaryComponent() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/payroll/salary-components", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

// ── Employee Salaries ─────────────────────────────────────────────────────────

export type EmployeeSalaryItem = {
  id: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  mobileAllowance: number;
  otherAllowances: number;
  totalSalary: number;
  currency: string;
  effectiveFrom: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: { name: string } | null;
    position?: { title: string } | null;
  };
};

export function useEmployeeSalaries() {
  return useApiList<EmployeeSalaryItem>("/api/payroll/employee-salaries");
}

export function useUpsertEmployeeSalary() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/payroll/employee-salaries", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

// ── Salary Advances ───────────────────────────────────────────────────────────

export type SalaryAdvanceItem = {
  id: string;
  amount: number;
  reason: string | null;
  month: number;
  year: number;
  status: string;
  createdAt: string;
  employee: { firstName: string; lastName: string; employeeId: string };
};

export function useSalaryAdvances() {
  return useApiList<SalaryAdvanceItem>("/api/payroll/advances");
}

export function useSalaryAdvanceMutation() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/payroll/advances", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

// ── Reports ───────────────────────────────────────────────────────────────────

type ReportsData = {
  stats: PayrollStats;
  history: PayrollSummaryReport[];
};

export function usePayrollReports() {
  return useApiOne<ReportsData>("/api/payroll/reports/summary");
}
