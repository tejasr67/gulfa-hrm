# Reusable Patterns Guide

> Copy these exact patterns. Do not invent variations. Consistency across modules is more valuable than local cleverness.

---

## 1. Server Action Pattern

Every `"use server"` action follows this exact structure:

```ts
"use server";

import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/utils/audit";
import { z } from "zod";

const inputSchema = z.object({
  // ... fields
});

export async function doSomething(raw: unknown) {
  // 1. Auth — always first
  const session = await requireSession();

  // 2. Permission — always second
  requirePermission(session, "MODULE:ACTION");

  // 3. Validate input
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // 4. Business logic — use transaction if multiple writes
  try {
    const result = await prisma.$transaction(async (tx) => {
      // ... queries and mutations
      // ALWAYS include companyId from session, never from input
      return tx.entity.create({
        data: { ...data, companyId: session.companyId },
      });
    });

    // 5. Audit log — fire and forget, NEVER await on critical path
    void writeAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: "ENTITY_ACTION",
      entityType: "Entity",
      entityId: result.id,
      after: result,
    });

    return { success: true, data: result };
  } catch (e) {
    console.error("[doSomething]", e);
    return { success: false, error: "Failed to complete action" };
  }
}
```

**Key invariants:**
- `requireSession()` before anything
- `requirePermission()` before any DB access
- `companyId` always from `session`, never from parsed input
- Audit log is always `void writeAuditLog(...)` — never awaited
- Catch block returns `{ success: false, error }`, never throws

---

## 2. Route Handler Pattern

```ts
import { requireSession } from "@/lib/auth/session";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { parseQueryParams, paginationSchema } from "@/lib/api/query-params";
import { getSomethingList } from "@/modules/[module]/queries";
import { doSomething } from "@/modules/[module]/actions";
import { z } from "zod";

const querySchema = paginationSchema.extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const bodySchema = z.object({
  name: z.string().min(1),
});

// GET — list or detail
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const filters = parseQueryParams(querySchema, url.searchParams);
    if (!filters.success) return err(filters.error);

    const data = await getSomethingList(session.companyId, filters.data);
    return ok(data);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

// POST — create
export async function POST(request: Request) {
  try {
    const session = await requireSession();   // auth check (actions.ts does permission check)
    const body = await request.json();
    const result = await doSomething(body);   // delegate entirely to action
    if (!result.success) return err(result.error ?? "Failed");
    return ok(result.data);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
```

**Key invariants:**
- Route handlers never contain business logic — they parse and delegate
- Always catch `"Unauthorized"` from `requireSession()` and return `unauthorized()`
- Never return raw Prisma errors to the client
- `parseQueryParams` handles coercion and validation in one step

---

## 3. Query Function Pattern

```ts
import "server-only";
import { prisma } from "@/lib/db";
import type { LeaveRequest } from "@/modules/leave/types";
import type { LeaveFilters } from "@/modules/leave/schema";

export async function getLeaveRequests(
  companyId: string,
  filters: LeaveFilters,
): Promise<LeaveRequest[]> {
  return prisma.leaveRequest.findMany({
    where: {
      companyId,                           // always first filter
      ...(filters.status && { status: filters.status }),
      ...(filters.employeeId && { employeeId: filters.employeeId }),
      ...(filters.startDate && filters.endDate && {
        startDate: { gte: filters.startDate },
        endDate: { lte: filters.endDate },
      }),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, photo: true } },
      leaveType: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 20,
    skip: ((filters.page ?? 1) - 1) * (filters.limit ?? 20),
  });
}
```

**Key invariants:**
- `import "server-only"` at top of queries.ts (or per-function if split)
- `companyId` is always the first `where` filter
- Always specify `include`/`select` explicitly — never return full records with all relations
- Export the corresponding TypeScript type from `types.ts`

---

## 4. Client Hook Pattern

```ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { LeaveRequest } from "@/modules/leave/types";

export function useLeaveRequests(employeeId: string) {
  const [data, setData] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await window.fetch(
          `/api/leave/requests?employeeId=${encodeURIComponent(employeeId)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError(json.error ?? "Failed to load");
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [employeeId, tick]);

  return { data, loading, error, refetch };
}
```

**Key invariants:**
- Use `window.fetch` — never name a variable or function `fetch` (shadows the global)
- Always use `AbortController` for cleanup
- Expose `refetch` as a `tick`-based callback — avoids stale closure issues
- Return `{ data, loading, error, refetch }` — consistent shape across all hooks
- Never call server actions directly from hooks — go through the API route

---

## 5. Transaction with Race Condition Prevention

```ts
const result = await prisma.$transaction(async (tx) => {
  // 1. Advisory lock — prevent concurrent mutations on the same resource
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${employeeId}))`;

  // 2. Check-then-write inside the transaction (TOCTOU safe)
  const existing = await tx.leaveBalance.findFirst({
    where: { employeeId, leaveTypeId, companyId },
  });

  if (!existing) throw new Error("Balance record not found");
  if (existing.remaining < requiredDays) throw new Error("Insufficient balance");

  // 3. Write — only if check passed
  const [request, _balance] = await Promise.all([
    tx.leaveRequest.create({ data: { ... } }),
    tx.leaveBalance.update({
      where: { id: existing.id },
      data: {
        pending: { increment: requiredDays },
        remaining: { decrement: requiredDays },
      },
    }),
  ]);

  return request;
});
```

**When to use transactions:**
- Any action that reads-then-writes (balance check + deduction)
- Any action that writes to 2+ tables
- Any workflow step that must be atomic (approve + notify + balance update)

---

## 6. Overlap Check Pattern

Always run overlap checks inside the transaction that creates/updates the leave request:

```ts
import { checkOverlappingLeave } from "@/lib/leave/overlap";

const result = await prisma.$transaction(async (tx) => {
  const overlaps = await checkOverlappingLeave(
    employeeId,
    startDate,
    endDate,
    undefined,  // excludeId — pass existing request ID for updates
    tx,
  );
  if (overlaps.length > 0) {
    throw new Error(
      `Overlaps with existing leave from ${format(overlaps[0].startDate, "dd/MM/yyyy")}`,
    );
  }
  // ... proceed with create
});
```

---

## 7. Form Component Pattern

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle } from "lucide-react";
import { someAction } from "@/modules/[module]/actions";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // Use z.string() for date fields, convert in onSubmit
  startDate: z.string().min(1, "Start date is required"),
});

type FormData = z.infer<typeof formSchema>;

type Props = {
  onSuccess: () => void;
  onClose: () => void;
};

export function SomeForm({ onSuccess, onClose }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<FormData>({ resolver: zodResolver(formSchema) as any });
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = form;

  async function onSubmit(data: FormData) {
    setSubmitError(null);
    const result = await someAction({
      ...data,
      startDate: new Date(data.startDate),   // convert string → Date in onSubmit
    });
    if (!result.success) {
      setSubmitError(result.error ?? "Failed");
      return;
    }
    reset();
    onSuccess();
    onClose();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Fields */}
      <div className="space-y-1">
        <label className="text-sm font-medium">Name *</label>
        <Input {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </div>
    </form>
  );
}
```

---

## 8. Server Page Pattern

```tsx
// app/(dashboard)/[module]/page.tsx — server component
import { requireSession } from "@/lib/auth/session";
import { getModuleData } from "@/modules/[module]/queries";
import { ModuleDashboardClient } from "./_components/ModuleDashboardClient";
import { redirect } from "next/navigation";

export default async function ModulePage() {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/login");
  }

  const [data, leaveTypes] = await Promise.all([
    getModuleData(session.companyId),
    getLeaveTypes(session.companyId),
  ]);

  return <ModuleDashboardClient data={data} leaveTypes={leaveTypes} employeeId={session.employeeId} />;
}
```

**Key invariants:**
- Pages are async server components
- Auth failure redirects to `/login` — never returns an error response from a page
- Parallel data fetching with `Promise.all` when fetches are independent
- Passes data as props to a `*Client.tsx` wrapper — never fetches from client in the page file

---

## 9. StatusBadge Extension Pattern

When adding new statuses for a module, extend `LEAVE_STATUS_MAP` (or module equivalent) in `src/components/shared/StatusBadge/index.tsx`:

```ts
const LEAVE_STATUS_MAP: Record<string, StatusVariant> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED: "secondary",
  PENDING_RELIEVER: "warning",
  IN_REVIEW: "info",
  WITHDRAWN: "secondary",
};
```

Status badge variants: `"default"` | `"success"` | `"warning"` | `"destructive"` | `"info"` | `"secondary"`

---

## 10. Pagination Pattern

```ts
// Query function signature
async function getList(
  companyId: string,
  filters: { page?: number; limit?: number; search?: string },
): Promise<{ items: T[]; total: number; page: number; limit: number }> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? PAGINATION_DEFAULTS.limit;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.entity.findMany({ where: { companyId }, take: limit, skip }),
    prisma.entity.count({ where: { companyId } }),
  ]);

  return { items, total, page, limit };
}
```

Use `PAGINATION_DEFAULTS` from `src/lib/utils/constants.ts` — never hardcode `20` or `10`.

---

## 11. Prisma Type Inference Pattern

Always use `Prisma.XxxGetPayload` to derive types from queries — never write manual interfaces that duplicate Prisma model fields:

```ts
import { Prisma } from "@prisma/client";

// Define the include/select shape as a const
const leaveRequestInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, photo: true } },
  leaveType: { select: { id: true, name: true, code: true, isPaid: true } },
  reliever: { select: { id: true, firstName: true, lastName: true } },
  approvalActions: {
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.LeaveRequestInclude;

// Derive the type from the include shape
export type LeaveRequestWithRelations = Prisma.LeaveRequestGetPayload<{
  include: typeof leaveRequestInclude;
}>;
```

---

## 12. Error Boundary for Client Data Loading

```tsx
// In client components that fetch via hooks
if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

if (error) return (
  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
    <AlertCircle className="h-4 w-4 shrink-0" />
    {error}
  </div>
);

if (!data.length) return (
  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
    <CalendarDays className="h-8 w-8 mb-2" />
    <p className="text-sm">No records found</p>
  </div>
);
```

Use a relevant icon from `lucide-react` for the empty state — always pick the icon that represents the module entity.
