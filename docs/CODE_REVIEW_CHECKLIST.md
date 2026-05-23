# Code Review Checklist

> Use this checklist for every PR review. Items marked **BLOCK** must be resolved before merge. Items marked **WARN** should be addressed but may be deferred with a comment.

---

## Security — All BLOCK

- [ ] **BLOCK** `requireSession()` is called before any database access in every action and route handler
- [ ] **BLOCK** `requirePermission(session, "MODULE:ACTION")` is called before any data read or write
- [ ] **BLOCK** `companyId` is taken from `session.companyId`, never from request body or URL params
- [ ] **BLOCK** No raw SQL injection vectors (all dynamic values use Prisma parameterization or `$queryRaw` with tagged template literals)
- [ ] **BLOCK** No sensitive fields (salary, bank account, national ID, password hash) returned in API responses without explicit authorization
- [ ] **BLOCK** No `companyId` field in Zod schemas used for server action input validation

---

## Multi-Tenancy — All BLOCK

- [ ] **BLOCK** Every `findMany`, `findFirst`, `findUnique` includes `companyId` in the `where` clause (exception: lookup tables like `LeaveType` if they're company-scoped via a join)
- [ ] **BLOCK** Every `create` includes `companyId: session.companyId`
- [ ] **BLOCK** `update` and `delete` operations filter by both `id` and `companyId` to prevent cross-tenant mutation
- [ ] **BLOCK** Aggregation queries (`count`, `aggregate`, `groupBy`) include `companyId`

---

## Data Integrity — All BLOCK

- [ ] **BLOCK** Any action that does check-then-write uses `prisma.$transaction()` with advisory lock
- [ ] **BLOCK** Multi-row mutations use `prisma.$transaction()` — not sequential awaits
- [ ] **BLOCK** Leave balance mutations use `{ increment: n }` / `{ decrement: n }` operators, never `{ set: computed }` (race condition)
- [ ] **BLOCK** Overlap/conflict checks run inside the same transaction as the create/update
- [ ] **BLOCK** `writeAuditLog(...)` is called with `void` — never `await`ed on the critical path

---

## API and Response Shape — All BLOCK

- [ ] **BLOCK** All route handlers return responses via helpers from `src/lib/api/response.ts` (`ok`, `err`, `unauthorized`, `forbidden`, `notFound`, `serverError`)
- [ ] **BLOCK** No raw `Response` or `NextResponse` objects constructed in route handlers
- [ ] **BLOCK** All server actions return `{ success: true, data? }` or `{ success: false, error: string }` — never throw to the caller
- [ ] **BLOCK** Route handlers catch `"Unauthorized"` from `requireSession()` and return `unauthorized()`

---

## Input Validation — All BLOCK

- [ ] **BLOCK** All user input validated with Zod before touching any business logic
- [ ] **BLOCK** Zod errors reported with `.issues[0]?.message` (not `.errors`)
- [ ] **BLOCK** No `.extend()` called on schemas with `.refine()` or `.superRefine()`
- [ ] **BLOCK** Date fields in form schemas use `z.string()`, not `z.coerce.date()`

---

## Prisma Usage — BLOCK unless noted

- [ ] **BLOCK** No `new PrismaClient()` — all queries use the singleton from `src/lib/db`
- [ ] **BLOCK** All `include`/`select` shapes explicitly defined — no naked `findMany` or `findFirst` without a select
- [ ] **BLOCK** `Prisma.XxxGetPayload` used for type derivation — no manually written type aliases that mirror model fields
- [ ] **WARN** N+1 queries in loops — batch with `findMany` + `.filter()` or use `Promise.all`

---

## Architecture — BLOCK unless noted

- [ ] **BLOCK** Business logic lives in `modules/[module]/actions.ts` — not in route handlers, pages, or components
- [ ] **BLOCK** `queries.ts` files have `import "server-only"` or are only imported from server contexts
- [ ] **BLOCK** `hooks.ts` files use `window.fetch` — no server action imports, no direct Prisma calls
- [ ] **BLOCK** No cross-module component imports (`modules/leave/` importing from `modules/employees/` component folder)
- [ ] **WARN** New components not added to `shared/` when used by 2+ modules
- [ ] **WARN** Page file uses `"use client"` at the top level

---

## React / Next.js — BLOCK unless noted

- [ ] **BLOCK** No shadowing of the global `fetch` in client code — use `window.fetch`
- [ ] **BLOCK** `useEffect` fetches have `AbortController` cleanup
- [ ] **BLOCK** Client components with `"use client"` do not import from `server-only` modules
- [ ] **WARN** Modal components missing `open`, `onClose`, `onSuccess` prop pattern
- [ ] **WARN** Loading/error/empty states missing in data-dependent components

---

## UAE Business Rules — BLOCK unless noted

- [ ] **BLOCK** No hardcoded weekday arrays — working days from `WorkingDaysConfig`
- [ ] **BLOCK** No hardcoded holiday lists — holidays from `HolidayCalendar`
- [ ] **WARN** Monetary amounts not using `CURRENCY` constant from `constants.ts`
- [ ] **WARN** Dates formatted without `formatDate()` from `src/lib/utils/formatters.ts`
- [ ] **WARN** Timezone not applied for date display (should use `TIMEZONE = "Asia/Dubai"`)

---

## Code Quality — WARN unless noted

- [ ] **WARN** `console.log` left in production code (only `console.error` in catch blocks is acceptable)
- [ ] **WARN** TODO/FIXME comments without a linked ticket
- [ ] **WARN** Magic numbers (e.g., `30`, `0.5`) without a named constant
- [ ] **WARN** Duplicated logic that should be extracted to a shared utility
- [ ] **WARN** New shadcn/ui primitive components not placed in `src/components/ui/`
- [ ] **WARN** Permission strings not imported from `PERMISSIONS` constant
- [ ] **WARN** Hard-coded "AED" strings instead of `CURRENCY` constant

---

## Post-Review Gate

Before approving:

1. Does this PR include a migration? → Verify migration is forwards-compatible (no column drops without a deploy window)
2. Does this PR add a new module? → Verify `MODULE_INTEGRATION_GUIDE.md` checklist was followed
3. Does this PR touch auth/permissions? → Extra scrutiny on all five security checks above
4. Does this PR touch leave balances? → Verify transaction + advisory lock pattern used
