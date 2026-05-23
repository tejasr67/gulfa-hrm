# New Module Integration Guide

> Follow this guide end-to-end when adding a new module (e.g., Payroll, Performance, Training, Assets). Skipping steps causes architectural drift.

---

## What Is a "Module"?

A module is a self-contained domain of business logic. Examples: `leave`, `employees`, `payroll`, `assets`, `attendance`, `performance`, `documents`.

A module owns:
- Its Prisma models
- Its server actions and queries
- Its API routes
- Its UI components and pages
- Its permissions

---

## Step 1 — Prisma Schema

Add models to `prisma/schema.prisma`.

### Required Fields on Every New Model

```prisma
model YourEntity {
  id          String   @id @default(cuid())
  companyId   String                         // multi-tenancy
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
  
  // ... your fields
  
  @@index([companyId])                       // always index the tenant key
}
```

### Checklist

- [ ] All models include `id`, `companyId`, `createdAt`, `updatedAt`
- [ ] Cascade delete set on `company` relation
- [ ] `@@index([companyId])` on all models
- [ ] Compound index `@@index([companyId, employeeId])` if employee-scoped
- [ ] Enums defined in `schema.prisma` (not in TypeScript)
- [ ] Run `prisma migrate dev --name add-[module-name]`

---

## Step 2 — Permissions

Add permission strings to `src/lib/utils/constants.ts`:

```ts
export const PERMISSIONS = {
  // ... existing ...
  YOUR_MODULE: {
    VIEW: "YOUR_MODULE:VIEW",
    CREATE: "YOUR_MODULE:CREATE",
    UPDATE: "YOUR_MODULE:UPDATE",
    DELETE: "YOUR_MODULE:DELETE",
    MANAGE: "YOUR_MODULE:MANAGE",   // admin-level operations
  },
} as const;
```

### Standard Permission Set per Module

| Permission | Who Has It | What It Guards |
|---|---|---|
| `MODULE:VIEW` | All authenticated users | Read own data |
| `MODULE:VIEW_ALL` | HR, Admin | Read all employees' data |
| `MODULE:CREATE` | Employee (self) or HR | Submit/create records |
| `MODULE:UPDATE` | HR, Admin | Edit existing records |
| `MODULE:DELETE` | Admin only | Hard delete |
| `MODULE:MANAGE` | HR, Admin | Configuration, bulk ops |
| `MODULE:APPROVE` | Manager, HR | Approval workflow |

Add role-to-permission mappings in the same file if the `checkPermission` logic needs updating.

---

## Step 3 — Module Files

Create the five core files in `src/modules/[module]/`:

### `types.ts`

```ts
import { Prisma } from "@prisma/client";

const yourEntityInclude = {
  employee: { select: { id: true, firstName: true, lastName: true, photo: true } },
  // ... other relations
} satisfies Prisma.YourEntityInclude;

export type YourEntityWithRelations = Prisma.YourEntityGetPayload<{
  include: typeof yourEntityInclude;
}>;

export type YourEntityStats = {
  total: number;
  // ...
};
```

### `schema.ts`

```ts
import { z } from "zod";

export const createYourEntitySchema = z.object({
  // Use z.string() for dates
  // Use z.enum([...]) for status fields — mirror Prisma enums
  // Never include companyId
});

export const yourEntityFiltersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export type CreateYourEntityInput = z.infer<typeof createYourEntitySchema>;
export type YourEntityFilters = z.infer<typeof yourEntityFiltersSchema>;
```

### `queries.ts`

```ts
import "server-only";
import { prisma } from "@/lib/db";
import type { YourEntityWithRelations, YourEntityFilters } from "./types";

export async function getYourEntities(
  companyId: string,
  filters: YourEntityFilters,
): Promise<{ items: YourEntityWithRelations[]; total: number; page: number; limit: number }> {
  const { page, limit, search, status } = filters;
  const skip = (page - 1) * limit;

  const where = {
    companyId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.yourEntity.findMany({ where, include: yourEntityInclude, take: limit, skip, orderBy: { createdAt: "desc" } }),
    prisma.yourEntity.count({ where }),
  ]);

  return { items, total, page, limit };
}
```

### `actions.ts`

```ts
"use server";

import { requireSession } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/utils/audit";
import { PERMISSIONS } from "@/lib/utils/constants";
import { createYourEntitySchema } from "./schema";

export async function createYourEntity(raw: unknown) {
  const session = await requireSession();
  requirePermission(session, PERMISSIONS.YOUR_MODULE.CREATE);

  const parsed = createYourEntitySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const entity = await prisma.yourEntity.create({
      data: { ...parsed.data, companyId: session.companyId },
    });

    void writeAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: "YOUR_ENTITY_CREATED",
      entityType: "YourEntity",
      entityId: entity.id,
      after: entity,
    });

    return { success: true, data: entity };
  } catch (e) {
    console.error("[createYourEntity]", e);
    return { success: false, error: "Failed to create" };
  }
}
```

### `hooks.ts`

```ts
"use client";

import { useState, useEffect, useCallback } from "react";
import type { YourEntityWithRelations } from "./types";

export function useYourEntities(filters?: Record<string, string>) {
  const [data, setData] = useState<YourEntityWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams(filters ?? {});

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await window.fetch(`/api/[module]?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success) setData(json.data?.items ?? json.data);
        else setError(json.error ?? "Failed to load");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [tick, JSON.stringify(filters)]);

  return { data, loading, error, refetch };
}
```

---

## Step 4 — API Routes

Create route files in `src/app/api/[module]/`:

### Collection Route (`route.ts`)

```ts
// src/app/api/[module]/route.ts
import { requireSession } from "@/lib/auth/session";
import { ok, err, unauthorized, serverError } from "@/lib/api/response";
import { parseQueryParams } from "@/lib/api/query-params";
import { getYourEntities } from "@/modules/[module]/queries";
import { createYourEntity } from "@/modules/[module]/actions";
import { yourEntityFiltersSchema } from "@/modules/[module]/schema";

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const url = new URL(request.url);
    const filters = parseQueryParams(yourEntityFiltersSchema, url.searchParams);
    if (!filters.success) return err(filters.error);
    const data = await getYourEntities(session.companyId, filters.data);
    return ok(data);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const body = await request.json();
    const result = await createYourEntity(body);
    if (!result.success) return err(result.error ?? "Failed");
    return ok(result.data);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
```

### Item Route (`[id]/route.ts`)

Follow the same pattern with `PATCH` and `DELETE` methods.

---

## Step 5 — UI Components

Create components in `src/components/modules/[module]/`:

### Required Components (minimum viable)

| Component | Purpose |
|---|---|
| `[Module]StatsBar.tsx` | 4 stat cards at top of dashboard |
| `[Module]Table.tsx` | Paginated list with filters |
| `Create[Entity]Modal.tsx` | Create form in a dialog |
| `Edit[Entity]Modal.tsx` | Edit form in a dialog (optional, can reuse create) |

### Recommended Components

| Component | When |
|---|---|
| `[Module]AnalyticsCharts.tsx` | If module has analytics data |
| `[Module]Calendar.tsx` | If module is time-based |
| `[Entity]Card.tsx` | If detail view is card-based |

---

## Step 6 — Pages

Create pages in `src/app/(dashboard)/[module]/`:

### Dashboard Page

```ts
// src/app/(dashboard)/[module]/page.tsx
import { requireSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getYourEntities } from "@/modules/[module]/queries";
import { ModuleDashboardClient } from "./_components/ModuleDashboardClient";

export default async function ModulePage() {
  let session;
  try { session = await requireSession(); }
  catch { redirect("/login"); }

  const data = await getYourEntities(session.companyId, { page: 1, limit: 20 });
  return <ModuleDashboardClient data={data} employeeId={session.employeeId} />;
}
```

### Sub-Pages (optional)

Add sub-pages as needed: `/[module]/settings`, `/[module]/analytics`, `/[module]/[id]`.

---

## Step 7 — Navigation

Add the new module to the sidebar in `src/components/shared/Sidebar/index.tsx`:

```ts
const navigation = [
  // ... existing
  {
    name: "Your Module",
    href: "/[module]",
    icon: SomeIcon,              // from lucide-react
    permission: PERMISSIONS.YOUR_MODULE.VIEW,
  },
];
```

---

## Step 8 — Seed Data (if needed)

Add seed data to `prisma/seed.ts`:

```ts
// Create [module] configuration for each seeded company
await prisma.yourModuleConfig.createMany({
  data: companies.map((c) => ({
    companyId: c.id,
    // ... default config
  })),
  skipDuplicates: true,
});
```

Run `npx prisma db seed` to verify.

---

## Module Integration Verification Checklist

After completing all steps:

- [ ] `prisma migrate dev` runs without errors
- [ ] `npm run build` passes without TypeScript errors
- [ ] Create action enforces `requirePermission` (test with wrong role)
- [ ] List query always includes `companyId` filter
- [ ] API route returns `{ success, data, error }` envelope
- [ ] Client hook uses `window.fetch` with `AbortController`
- [ ] Loading, error, empty states rendered in the table component
- [ ] Module appears in sidebar only for users with the VIEW permission
- [ ] Audit log entry created on create/update/delete actions
- [ ] Seed data (if any) runs without errors

---

## Existing Modules Reference

| Module | Path | Key Entity | Special Logic |
|---|---|---|---|
| Employees | `src/modules/employees/` | `Employee` | Emirates ID validation, BFS department tree |
| Leave | `src/modules/leave/` | `LeaveRequest` | Multi-level approval, reliever workflow, carry-forward |
| Documents | `src/modules/documents/` | `EmployeeDocument` | Supabase Storage signed URLs, expiry tracking |
| Attendance | `src/modules/attendance/` | `AttendanceRecord` | Working day calculation, shift patterns |
| Assets | `src/modules/assets/` | `Asset` | Asset code generation, assignment history |

Use these as patterns when building new modules — read one before starting.
