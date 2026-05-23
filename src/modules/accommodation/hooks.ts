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

export type AccommodationStats = {
  properties: number;
  rooms: number;
  totalCapacity: number;
  occupied: number;
  available: number;
  unassigned: number;
};

export type RoomAssignment = {
  id: string;
  assignedAt: string;
  vacatedAt: string | null;
  monthlyRent: number | null;
  notes: string | null;
  vacateNotes: string | null;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: { name: string } | null;
    position?: { title: string } | null;
  };
};

export type RoomEntry = {
  id: string;
  roomNumber: string;
  floor: string | null;
  capacity: number;
  isActive: boolean;
  assignments: RoomAssignment[];
  _count: { assignments: number };
};

export type AccommodationListEntry = {
  id: string;
  name: string;
  address: string;
  city: string | null;
  capacity: number;
  type: string;
  amenities: string[];
  isActive: boolean;
  createdAt: string;
  rooms: RoomEntry[];
  _count: { rooms: number };
};

export type OccupancyPropertyReport = {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string | null;
  isActive: boolean;
  rooms: number;
  totalCapacity: number;
  occupied: number;
  available: number;
  utilization: number;
  totalHistoricalAssignments: number;
  roomDetails: {
    id: string;
    roomNumber: string;
    floor: string | null;
    capacity: number;
    activeOccupants: {
      assignmentId: string;
      employee: { id: string; firstName: string; lastName: string; employeeId: string; department: { name: string } | null };
      assignedAt: string;
      monthlyRent: number | null;
    }[];
  }[];
};

export type UnassignedEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  department: { name: string } | null;
  position: { title: string } | null;
  nationality: string | null;
};

// ── Stats hook ─────────────────────────────────────────────────────────────

export function useAccommodationStats() {
  const [data, setData] = useState<AccommodationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/accommodation/stats", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

// ── List hook ──────────────────────────────────────────────────────────────

export function useAccommodations() {
  const [data, setData] = useState<AccommodationListEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/accommodation", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

// ── Reports hook ───────────────────────────────────────────────────────────

export function useOccupancyReport() {
  const [data, setData] = useState<OccupancyPropertyReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/accommodation/reports", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

// ── Unassigned employees hook ──────────────────────────────────────────────

export function useUnassignedEmployees() {
  const [data, setData] = useState<UnassignedEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setIsLoading(true);
    fetch("/api/accommodation/unassigned", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => { if (j.success) setData(j.data); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    return () => ctrl.abort();
  }, [tick]);

  return { data, isLoading, refetch };
}

// ── Mutation hooks ─────────────────────────────────────────────────────────

export function useCreateAccommodation() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/accommodation", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

export function useUpdateAccommodation(id: string) {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await patchJson(`/api/accommodation/${id}`, body); }
    finally { setIsMutating(false); }
  }, [id]);
  return { trigger, isMutating };
}

export function useCreateRoom() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/accommodation/rooms", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

export function useAccommodationAssignmentMutation() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (body: unknown) => {
    setIsMutating(true);
    try { return await postJson("/api/accommodation/assignments", body); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}

export function useBulkAccommodation() {
  const [isMutating, setIsMutating] = useState(false);
  const trigger = useCallback(async (rows: unknown[]) => {
    setIsMutating(true);
    try { return await postJson<{ results: unknown[]; succeeded: number; failed: number }>("/api/accommodation/bulk", { rows }); }
    finally { setIsMutating(false); }
  }, []);
  return { trigger, isMutating };
}
