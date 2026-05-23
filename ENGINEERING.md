# Gulfa HRM — Engineering Standards

> Master governance reference for all contributors and AI tools. Every module, PR, and code review must conform to these standards. Sub-documents in `docs/` provide detailed specifications.

---

## Quick Reference

| Topic | Document |
|---|---|
| Folder & file structure | [docs/FOLDER_ARCHITECTURE.md](docs/FOLDER_ARCHITECTURE.md) |
| Naming conventions | [docs/NAMING_STANDARDS.md](docs/NAMING_STANDARDS.md) |
| Reusable patterns | [docs/PATTERNS_GUIDE.md](docs/PATTERNS_GUIDE.md) |
| Anti-patterns | [docs/ANTI_PATTERNS.md](docs/ANTI_PATTERNS.md) |
| Code review checklist | [docs/CODE_REVIEW_CHECKLIST.md](docs/CODE_REVIEW_CHECKLIST.md) |
| PR checklist | [docs/PR_CHECKLIST.md](docs/PR_CHECKLIST.md) |
| New module integration | [docs/MODULE_INTEGRATION_GUIDE.md](docs/MODULE_INTEGRATION_GUIDE.md) |

---

## Stack Invariants

These are hard rules. Changing them requires an ADR (Architecture Decision Record).

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js App Router | 15.x |
| ORM | Prisma with PrismaPg adapter | 7.x |
| Database | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth + session wrapper | — |
| Validation | Zod | v4 |
| Forms | React Hook Form + Zod resolver | — |
| State | Zustand with persist middleware | — |
| Styling | TailwindCSS v4 + shadcn/ui | — |
| Charts | Recharts | v3 |
| Email | Resend | v6 |
| Dates | date-fns | v4 |
| Runtime | Node.js / Vercel Edge (server actions only on Node) | — |

---

## Architecture in One Page

```
src/
  app/                    Next.js App Router
    api/                  Route handlers (thin — delegate to modules)
    (dashboard)/          Authenticated layout + pages
  components/
    ui/                   Primitive shadcn/ui components (no business logic)
    shared/               Cross-module smart components
    modules/[module]/     Module-specific presentational components
  modules/[module]/       Business logic core
    actions.ts            "use server" — all mutations
    queries.ts            Server-side reads (Prisma)
    hooks.ts              Client-side data fetching (window.fetch)
    types.ts              Prisma payload types + domain types
    schema.ts             Zod schemas (forms + API validation)
  lib/
    auth/                 Session + permission guards
    api/                  Response helpers + query param parsing
    [module]/             Module-scoped pure utilities
    utils/                Shared formatters, constants, audit
  stores/                 Zustand client stores
  types/                  Global TypeScript interfaces
prisma/
  schema.prisma           Data model
  migrations/             Applied migration history
docs/                     Engineering governance documents
```

---

## The Five Non-Negotiable Rules

### 1. Multi-Tenancy Is Sacred
Every Prisma query that touches business data **must** include a `companyId` filter derived from `requireSession()`. Never trust a `companyId` from the request body — always read it from the session.

### 2. Permissions Before Data
Every server action and route handler calls `requirePermission(session, "MODULE:ACTION")` before touching the database. The permission string must match an entry in `PERMISSIONS` (`src/lib/utils/constants.ts`).

### 3. Zod Validates Everything at the Boundary
User input enters the system through Zod schemas only. Internal function-to-function calls skip validation. Never call `as unknown as T` to bypass Zod failures — fix the schema.

### 4. Transactions for Mutations with Side Effects
Any action that writes multiple rows, checks-then-writes (TOCTOU), or modifies a balance must use `prisma.$transaction()`. Leave the DB consistent or roll it back — never leave it half-written.

### 5. Audit Logs Are Non-Blocking
`writeAuditLog()` is fire-and-forget (`void writeAuditLog(...)`). Never `await` it on the critical path. Never let audit log failure abort a business operation.

---

## Response Envelope

All API routes return:

```ts
{ data: T | null, error: string | null, success: boolean }
```

Use helpers from `src/lib/api/response.ts`:

```ts
return ok(data);           // 200 { data, error: null, success: true }
return err("message");     // 400 { data: null, error, success: false }
return unauthorized();     // 401
return forbidden();        // 403
return notFound("Entity"); // 404
return serverError(e);     // 500 (logs internally)
```

Never construct raw `Response` or `NextResponse` objects in route handlers.

---

## Server Action Return Shape

```ts
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };
```

Always return `{ success: false, error: string }` instead of throwing. The client checks `result.success` before reading `result.data`.

---

## Prisma Adapter Pattern

`schema.prisma` does **not** contain a `url` in the datasource block. The connection string is injected at runtime via the PrismaPg adapter. This means:

- `prisma migrate dev` requires env vars set before running
- `prisma.config.ts` (project root) must point to the schema file
- All Prisma client imports go through `src/lib/db.ts` — never instantiate `PrismaClient` directly

---

## Zod v4 Compatibility Notes

- Use `error:` not `required_error:` in field options
- Use `.issues` not `.errors` on `ZodError`
- Never call `.extend()` on a schema that has `.refine()` or `.superRefine()` — define a new `z.object()` instead
- `z.coerce.date()` produces `unknown` in some contexts — use `z.string()` for form date fields, convert in the action

---

## UAE Business Rules

- Working week: Sun–Thu (government) or Mon–Fri (private sector) — stored in `WorkingDaysConfig`
- All monetary amounts in AED (`CURRENCY = "AED"` from constants)
- Timezone: `Asia/Dubai` for all date display and scheduler logic
- Date display format: `dd/MM/yyyy` via `formatDate()` from `src/lib/utils/formatters.ts`
- Never hardcode weekday sets — always read from `WorkingDaysConfig` for the company

---

## Adding a New Module

See [docs/MODULE_INTEGRATION_GUIDE.md](docs/MODULE_INTEGRATION_GUIDE.md) for the full checklist. The short version:

1. Add Prisma models → migrate
2. Add `PERMISSIONS` entries in `constants.ts`
3. Create `src/modules/[name]/{actions,queries,hooks,types,schema}.ts`
4. Create `src/app/api/[name]/` route handlers
5. Create `src/components/modules/[name]/` UI
6. Create `src/app/(dashboard)/[name]/` page(s)
7. Wire navigation in `src/components/shared/Sidebar`
8. Add seed data if needed

---

## Enforcement

- PRs that violate the five non-negotiable rules are blocked until fixed
- AI-generated code must pass the same checklist as human-written code
- If a pattern in this document conflicts with what you see in the codebase, the codebase is wrong — fix it
