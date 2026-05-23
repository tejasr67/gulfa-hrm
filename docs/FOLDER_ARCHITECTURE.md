# Folder Architecture Rules

> Canonical structure for Gulfa HRM. Every file must live in exactly one of these locations. When in doubt, follow the module boundary rule: code belongs to the module that owns the data it operates on.

---

## Top-Level Map

```
gulfa-hrm/
├── prisma/
│   ├── schema.prisma         # Single source of truth for data model
│   ├── migrations/           # Prisma-managed migration history — never edit manually
│   └── seed.ts               # Dev seed script
├── prisma.config.ts          # Prisma v7 config — schema path only
├── src/
│   ├── app/                  # Next.js App Router
│   ├── components/           # All React components
│   ├── modules/              # Business logic (server-side)
│   ├── lib/                  # Shared infrastructure utilities
│   ├── stores/               # Zustand client stores
│   └── types/                # Global TypeScript types
├── docs/                     # Engineering governance documents
├── ENGINEERING.md            # Master governance reference
└── CLAUDE.md / AGENTS.md     # AI tool instructions
```

---

## `src/app/` — Next.js App Router

```
src/app/
├── (dashboard)/              # Authenticated route group
│   ├── layout.tsx            # Dashboard shell + sidebar
│   ├── [module]/
│   │   ├── page.tsx          # Server component (data fetch + pass to client)
│   │   ├── [sub]/
│   │   │   └── page.tsx
│   │   └── _components/      # Page-local components (NOT reusable elsewhere)
├── (auth)/                   # Public auth pages
│   └── login/page.tsx
├── api/
│   └── [module]/
│       ├── route.ts          # Collection endpoint (GET list, POST create)
│       └── [id]/
│           └── route.ts      # Item endpoint (GET one, PATCH, DELETE)
├── globals.css
└── layout.tsx                # Root layout
```

### Rules for `app/`

- Pages are **server components** by default. They fetch data and pass it as props to a `*Client.tsx` component.
- Avoid `"use client"` at the page level — keep it at the leaf component level.
- `_components/` folders are page-private. If a component is reused across two pages, promote it to `src/components/modules/[module]/`.
- API route handlers are thin adapters: parse → call module action/query → return envelope. No business logic in route handlers.
- Route handler files export only `GET`, `POST`, `PATCH`, `PUT`, `DELETE` — named exports matching HTTP verbs.

---

## `src/components/` — React Components

```
src/components/
├── ui/                       # Primitive shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   └── ...                   # One file per primitive
├── shared/                   # Cross-module smart components
│   ├── EmployeeAvatar/
│   │   └── index.tsx
│   ├── StatusBadge/
│   │   └── index.tsx
│   ├── DataTable/
│   │   └── index.tsx
│   └── Sidebar/
│       └── index.tsx
└── modules/
    └── [module]/             # Module-specific components
        ├── [FeatureName].tsx
        └── [FeatureName]Modal.tsx
```

### Rules for `components/`

- **`ui/`** — zero business logic. No Prisma types, no module imports, no permission checks. Wrap shadcn primitives only.
- **`shared/`** — used by 2+ modules. Accepts generic props, not module-specific types. Uses index pattern for named exports when co-locating sub-components.
- **`modules/[module]/`** — knows about its module's types. Never imports from another module's component folder.
- All client components must have `"use client"` as the first line.
- Modal components follow the `[Name]Modal` suffix pattern and accept `open`, `onClose`, `onSuccess` props.

---

## `src/modules/` — Business Logic Core

```
src/modules/
└── [module]/
    ├── actions.ts            # "use server" — all mutations (create, update, delete, approve)
    ├── queries.ts            # Server-side reads (Prisma queries)
    ├── hooks.ts              # Client-side data fetching (window.fetch → /api/[module]/)
    ├── types.ts              # TypeScript types (Prisma payload types + domain types)
    └── schema.ts             # Zod schemas (shared between forms and API validation)
```

### Rules for `modules/`

| File | "use server"? | Imports Prisma? | Imports Zod? | Called from |
|---|---|---|---|---|
| `actions.ts` | Yes | Yes | Yes | Client components, API routes |
| `queries.ts` | No | Yes | No | Server pages, actions, API routes |
| `hooks.ts` | No | No | No | Client components only |
| `types.ts` | No | Yes (types only) | No | Anywhere |
| `schema.ts` | No | No | Yes | Actions, forms, API routes |

- `actions.ts` is the **only** place mutations happen. Never call Prisma write methods from components, pages, or route handlers directly.
- `queries.ts` returns typed data. Never return raw Prisma objects — always specify the include/select shape and export the matching type from `types.ts`.
- `hooks.ts` calls `/api/[module]/` endpoints — never `actions.ts` directly from a hook (hooks are client-side).
- Cross-module reads are allowed (e.g., leave actions importing employee queries). Cross-module writes are not — route through the owning module's action.

---

## `src/lib/` — Infrastructure Utilities

```
src/lib/
├── auth/
│   ├── session.ts            # requireSession() → UserSession
│   └── permissions.ts        # requirePermission(), hasPermission(), isPrivilegedRole()
├── api/
│   ├── response.ts           # ok(), err(), unauthorized(), forbidden(), notFound(), serverError()
│   └── query-params.ts       # parseQueryParams(), paginationSchema, employeeQuerySchema
├── db.ts                     # Prisma client singleton (PrismaPg adapter)
├── [module]/                 # Module-scoped pure utilities (no DB, no auth)
│   └── [util-name].ts        # e.g., lib/leave/working-days.ts
└── utils/
    ├── constants.ts           # ROLES, PERMISSIONS, CURRENCY, TIMEZONE, DATE_FORMAT, etc.
    ├── formatters.ts          # formatDate(), formatCurrency(), generateEmployeeId(), etc.
    └── audit.ts               # writeAuditLog(), serializeForAudit()
```

### Rules for `lib/`

- `lib/auth/` and `lib/api/` are infrastructure — they must not import from `modules/`.
- `lib/[module]/` holds pure computation utilities for a module (date math, overlap checks, eligibility logic). No DB calls. No auth. No side effects.
- `lib/utils/constants.ts` is the single source for enum values, permission strings, and app-wide constants. Never define these inline.
- `lib/db.ts` exports a single Prisma client instance. Never instantiate `PrismaClient` elsewhere.

---

## `src/stores/` — Client State

```
src/stores/
└── auth.store.ts             # Zustand: session user, permissions, hydration
```

### Rules for `stores/`

- Stores hold UI/session state only — never server-fetched domain data (that lives in hooks).
- `auth.store.ts` is the only place `hasPermission()` is used on the client. It is purely for UI gating, never for security enforcement.
- Add new stores only when state must be shared across unrelated components without prop drilling.

---

## `src/types/` — Global Types

```
src/types/
└── index.ts                  # ApiResponse<T>, PaginatedResponse<T>, UserSession, AuditAction, Module
```

### Rules for `types/`

- Only global types that span multiple modules live here.
- Module-specific types belong in `src/modules/[module]/types.ts`.
- Never put Prisma `$Enums` or generated types here — import them from `@prisma/client` directly.

---

## Naming Patterns

| Artifact | Convention | Example |
|---|---|---|
| Pages | `page.tsx` (fixed) | `leave/page.tsx` |
| Client page wrapper | `[Module]DashboardClient.tsx` | `LeaveDashboardClient.tsx` |
| Modal components | `[Action][Subject]Modal.tsx` | `ApplyLeaveModal.tsx`, `ApproveLeaveModal.tsx` |
| Table components | `[Subject]Table.tsx` | `LeaveRequestsTable.tsx` |
| Card components | `[Subject]Card.tsx` | `LeaveBalanceCard.tsx` |
| Stats bar | `[Subject]StatsBar.tsx` | `LeaveStatsBar.tsx` |
| Charts | `[Subject]Charts.tsx` | `LeaveAnalyticsCharts.tsx` |
| Lib utilities | `[domain]-[purpose].ts` | `working-days.ts`, `overlap.ts` |
| API routes | match module path | `api/leave/requests/route.ts` |

---

## File Count Limits

If a module file exceeds these thresholds, split it:

| File | Max lines before split |
|---|---|
| `actions.ts` | 400 lines → `actions/[group].ts` |
| `queries.ts` | 300 lines → `queries/[group].ts` |
| `schema.ts` | 200 lines → `schema/[group].ts` |
| Any component | 250 lines → extract sub-components |

---

## What Belongs Where — Decision Tree

```
Is it a DB write?
  Yes → src/modules/[module]/actions.ts
  No → Is it a DB read?
    Yes → src/modules/[module]/queries.ts (or src/lib/[module]/ if shared)
    No → Is it client-side HTTP fetch?
      Yes → src/modules/[module]/hooks.ts
      No → Is it a React component?
        Yes → Is it a primitive UI element?
          Yes → src/components/ui/
          No → Is it used by 2+ modules?
            Yes → src/components/shared/
            No → src/components/modules/[module]/
        No → Is it a pure utility function?
          Yes → src/lib/utils/ or src/lib/[module]/
          No → src/lib/auth/ or src/lib/api/ (infrastructure)
```
