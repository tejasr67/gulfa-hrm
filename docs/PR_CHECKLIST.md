# Pull Request Checklist

> Complete this before opening a PR. Incomplete PRs will be sent back without review.

---

## PR Title Format

```
feat(module): short description of what changed
fix(module): short description of what was fixed
chore(scope): short description of non-functional change
refactor(module): short description
```

Examples:
- `feat(leave): add year-end carry-forward processing`
- `fix(leave): correct overlap check for half-day requests`
- `chore(docs): add engineering governance documents`
- `feat(employees): add Emirates ID duplicate detection`

---

## Pre-Submission Checklist

### Schema Changes

- [ ] Prisma schema updated with all new models, fields, enums
- [ ] Migration file generated (`prisma migrate dev --name description`)
- [ ] Migration is backwards-compatible (no column drops, no renames without alias)
- [ ] New models include `companyId String` for multi-tenant scoping
- [ ] New models include `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`
- [ ] `prisma.config.ts` not modified (schema path is fixed)

### Server Actions

- [ ] Every new action: `requireSession()` → `requirePermission()` → validate → execute → audit
- [ ] `companyId` sourced from `session.companyId` only
- [ ] Multi-write operations wrapped in `prisma.$transaction()`
- [ ] Check-then-write patterns use advisory locks inside transactions
- [ ] Audit log called with `void writeAuditLog(...)` (not awaited)
- [ ] All actions return `{ success: boolean; data?; error?: string }` — no throws

### API Routes

- [ ] Route handlers delegate to module actions/queries — no business logic inline
- [ ] All routes use `ok()`, `err()`, `unauthorized()`, `serverError()` helpers
- [ ] `"Unauthorized"` from `requireSession()` caught and returned as `unauthorized()`
- [ ] New routes documented with their HTTP method and expected request/response shape in a comment or the PR description

### Components

- [ ] New client components have `"use client"` as the first line
- [ ] `window.fetch` used (not shadowing global `fetch`)
- [ ] `useEffect` fetches have `AbortController` cleanup
- [ ] Loading, error, and empty states implemented
- [ ] Modal components accept `open`, `onClose`, `onSuccess` props
- [ ] No imports from another module's `components/modules/` folder

### Validation

- [ ] Zod schemas defined in `src/modules/[module]/schema.ts`
- [ ] No `z.coerce.date()` in form schemas (use `z.string()`)
- [ ] No `.extend()` on schemas with `.refine()`
- [ ] Error messages read via `.issues[0]?.message`

### TypeScript

- [ ] No new `any` types without eslint-disable comment explaining why
- [ ] Prisma types derived with `Prisma.XxxGetPayload` — no manual type duplication
- [ ] New types exported from `src/modules/[module]/types.ts`
- [ ] Type-only imports use `import type`

### Naming

- [ ] Files follow naming conventions in `docs/NAMING_STANDARDS.md`
- [ ] Permission strings use `PERMISSIONS` constant from `src/lib/utils/constants.ts`
- [ ] New permissions added to `PERMISSIONS` constant if introduced
- [ ] Monetary constants reference `CURRENCY`, date format references `DATE_FORMAT`

### UAE Rules

- [ ] Working day calculations use `WorkingDaysConfig` — no hardcoded weekday arrays
- [ ] Holiday exclusions use `HolidayCalendar` — no hardcoded holiday lists
- [ ] All displayed dates use `formatDate()` from `src/lib/utils/formatters.ts`
- [ ] Monetary amounts in AED, formatted with `formatCurrency()`

---

## PR Description Template

```markdown
## What Changed
<!-- 1-3 bullets on what this PR adds/fixes/changes -->

## Why
<!-- Business or technical motivation -->

## How to Test
<!-- Steps to manually verify the change works -->
1. Navigate to ...
2. Click ...
3. Verify ...

## Migration Notes
<!-- Any DB changes, new env vars, seed data updates -->
- Migration: `prisma/migrations/YYYY_description`
- New env vars: none / list them
- Seed changes: none / describe

## Checklist Exceptions
<!-- If you skipped any item above, explain why -->
```

---

## PR Size Guidelines

| Change Type | Max Files | Max Line Delta |
|---|---|---|
| Bug fix | 5 | ±100 |
| New feature (single module) | 15 | ±500 |
| New module | 30 | ±1500 |
| Refactor | 20 | ±500 net |
| Governance / docs | unlimited | — |

If your PR exceeds these, split it. The reviewer should be able to review the full PR in one sitting.

---

## After Merge

- [ ] Delete the feature branch
- [ ] Verify CI passes on main
- [ ] If migration was included: confirm applied to staging/production DB
- [ ] Update `docs/MODULE_INTEGRATION_GUIDE.md` if a new module was added
