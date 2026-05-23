# Naming Standards

> Consistent naming lets contributors navigate the codebase without reading every file. These rules apply to all contributors including AI tools.

---

## Files and Directories

### Directories

| Type | Convention | Examples |
|---|---|---|
| Module directory | `kebab-case` | `leave/`, `employees/`, `asset-management/` |
| Shared component | `PascalCase/` (index pattern) | `EmployeeAvatar/`, `StatusBadge/` |
| Sub-route group | `[kebab-case]` | `(dashboard)/`, `(auth)/` |
| Dynamic route | `[paramName]` | `[id]/`, `[employeeId]/` |

### Files

| Type | Convention | Examples |
|---|---|---|
| React component | `PascalCase.tsx` | `LeaveCalendar.tsx`, `ApplyLeaveModal.tsx` |
| Module layer | `camelCase.ts` | `actions.ts`, `queries.ts`, `hooks.ts` |
| Lib utility | `kebab-case.ts` | `working-days.ts`, `overlap.ts` |
| Zod schema file | `schema.ts` (per module) | `src/modules/leave/schema.ts` |
| Type file | `types.ts` (per module) | `src/modules/leave/types.ts` |
| Constants | `constants.ts` | `src/lib/utils/constants.ts` |
| Store | `[domain].store.ts` | `auth.store.ts` |
| Route handler | `route.ts` (fixed) | `api/leave/requests/route.ts` |
| Next.js page | `page.tsx` (fixed) | `leave/page.tsx` |
| Next.js layout | `layout.tsx` (fixed) | `(dashboard)/layout.tsx` |

---

## TypeScript

### Variables and Functions

```ts
// Variables — camelCase
const employeeId = "emp_001";
const pendingDays = 3.5;
const isHalfDay = true;

// Functions — camelCase, verb prefix
function calculateWorkingDays(...) {}
function checkOverlappingLeave(...) {}
function formatCurrency(...) {}

// Boolean variables — is/has/can/should prefix
const isApproved = true;
const hasActiveLeave = false;
const canEncash = leaveType.encashable;
const shouldNotify = config.notificationsEnabled;

// Event handlers — handle prefix
function handleApprove() {}
function handleDateChange() {}
```

### Types and Interfaces

```ts
// Type aliases — PascalCase
type ActionResult<T = void> = ...
type LeaveStats = { ... }

// Interfaces — PascalCase (prefer type aliases; use interface for extension)
interface LeaveCalendarEntry { ... }

// Prisma payload types — suffix with "WithRelations" or describe the shape
type LeaveRequestWithRelations = Prisma.LeaveRequestGetPayload<{
  include: { employee: true; leaveType: true }
}>

// Type-only imports
import type { LeaveAnalytics } from "@/modules/leave/types";
```

### Enums (Zod)

```ts
// Zod enum values — SCREAMING_SNAKE_CASE (mirrors Prisma)
z.enum(["PENDING", "APPROVED", "REJECTED"])
z.enum(["MORNING", "AFTERNOON"])

// Never define inline string literals where an enum exists
// Bad:
status: z.string()
// Good:
status: z.enum(["PENDING", "APPROVED", "REJECTED"])
```

### Constants

```ts
// Module-level constants — SCREAMING_SNAKE_CASE
const MAX_LEAVE_DAYS = 30;
const DEFAULT_PAGE_SIZE = 20;

// Object maps — SCREAMING_SNAKE_CASE key
const LEAVE_STATUS_COLORS = {
  PENDING: "warning",
  APPROVED: "success",
} as const;
```

---

## React Components

### Component Names

| Pattern | Convention | Example |
|---|---|---|
| Page wrapper (client) | `[Module]DashboardClient` | `LeaveDashboardClient` |
| Page wrapper (sub-page) | `[Sub][Module]Client` | `ApprovalsClient`, `CalendarClient` |
| Modal | `[Action][Subject]Modal` | `ApplyLeaveModal`, `ApproveLeaveModal` |
| Table | `[Subject]Table` | `LeaveRequestsTable`, `EmployeeTable` |
| Card | `[Subject]Card` | `LeaveBalanceCard`, `EmployeeProfileCard` |
| Stats bar | `[Subject]StatsBar` | `LeaveStatsBar`, `AttendanceStatsBar` |
| Charts block | `[Subject]Charts` | `LeaveAnalyticsCharts` |
| Form | `[Subject]Form` | `EmployeeForm`, `LeaveTypeForm` |
| List/grid | `[Subject]List` or `[Subject]Grid` | `EmployeeList`, `DocumentGrid` |

### Props Types

```ts
// Always name the props type "Props" — scoped by file, not global
type Props = {
  open: boolean;
  onClose: () => void;
  employeeId: string;
};

export function ApplyLeaveModal({ open, onClose, employeeId }: Props) { ... }
```

### Event Handler Props

```ts
// "on" prefix for props that receive handlers
type Props = {
  onClose: () => void;
  onSuccess: () => void;
  onChange: (value: string) => void;
};
```

---

## Zod Schemas

### Schema Variable Names

```ts
// Collection schema — camelCase, suffix "Schema"
const leaveFiltersSchema = z.object({ ... });
const createLeaveRequestSchema = z.object({ ... });
const approveLeaveSchema = z.object({ ... });

// Input type inferred from schema — suffix "Input" or "Data"
type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
type LeaveFilters = z.infer<typeof leaveFiltersSchema>;

// When the schema in actions.ts differs from the form schema (Zod v4 refine constraint)
// suffix with "InputSchema" to distinguish
const applyLeaveInputSchema = z.object({ ... }); // used in action only
```

---

## Prisma

### Model Names — PascalCase singular

```prisma
model LeaveRequest { ... }
model LeaveBalance { ... }
model EmployeeDocument { ... }
```

### Field Names — camelCase

```prisma
model LeaveRequest {
  id          String   @id @default(cuid())
  employeeId  String
  startDate   DateTime
  isHalfDay   Boolean  @default(false)
  currentStep Int      @default(1)
}
```

### Enum Names — PascalCase

```prisma
enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### Relation Fields — camelCase, descriptive

```ts
// Named relations disambiguate multiple FK to same model
employee    Employee @relation(fields: [employeeId], references: [id])
reliever    Employee? @relation("LeaveReliever", fields: [relieverId], references: [id])
```

---

## API Routes

### URL Patterns

```
/api/[module]/                    # Collection (GET list, POST create)
/api/[module]/[id]                # Item (GET one, PATCH update, DELETE)
/api/[module]/[action]            # Named action (POST only)
/api/[module]/[sub-resource]/     # Sub-collection
```

### Examples

```
/api/leave/requests               # GET all requests, POST new request
/api/leave/requests/[id]          # GET one, PATCH status
/api/leave/approvals/pending      # GET pending approvals
/api/leave/carry-forward          # POST trigger carry-forward
/api/employees/[id]/documents     # GET employee docs, POST upload
```

### Query Parameter Names

Follow the existing `employeeQuerySchema` and `paginationSchema` conventions:

```ts
// Pagination
?page=1&limit=20

// Filters
?status=PENDING&departmentId=dept_01&startDate=2025-01-01&endDate=2025-12-31

// Search
?search=john

// Employee-scoped
?employeeId=emp_01
```

---

## Permissions

Permission strings follow `MODULE:ACTION` with SCREAMING_SNAKE_CASE:

```ts
// Pattern: MODULE_NAME:ACTION_VERB
"LEAVE:VIEW"
"LEAVE:APPLY"
"LEAVE:APPROVE"
"LEAVE:MANAGE"
"EMPLOYEES:VIEW"
"EMPLOYEES:CREATE"
"EMPLOYEES:UPDATE"
"EMPLOYEES:DELETE"
"PAYROLL:VIEW"
"PAYROLL:PROCESS"
```

Permission keys in the `PERMISSIONS` constant mirror this exactly:

```ts
export const PERMISSIONS = {
  LEAVE: {
    VIEW: "LEAVE:VIEW",
    APPLY: "LEAVE:APPLY",
    APPROVE: "LEAVE:APPROVE",
    MANAGE: "LEAVE:MANAGE",
  },
} as const;
```

---

## Audit Log Actions

```ts
// Convention: PAST_TENSE_VERB on ENTITY
"LEAVE_REQUEST_SUBMITTED"
"LEAVE_REQUEST_APPROVED"
"LEAVE_REQUEST_REJECTED"
"LEAVE_REQUEST_CANCELLED"
"EMPLOYEE_CREATED"
"EMPLOYEE_UPDATED"
"DOCUMENT_UPLOADED"
"DOCUMENT_DELETED"
```

---

## Database Identifiers

Employee IDs generated by `generateEmployeeId()`:
- Format: `EMP-YYYY-NNNN` (e.g., `EMP-2025-0042`)

Asset codes generated by `generateAssetCode(type)`:
- Format: `[TYPE]-NNNN` (e.g., `LPT-0012`)

Never hardcode ID formats — always use the generator functions.

---

## Git Branches

```
feature/[module]-[short-description]    # New feature
fix/[module]-[short-description]        # Bug fix
chore/[short-description]               # Non-functional (deps, config, docs)
hotfix/[short-description]              # Production hotfix
```

Examples:
```
feature/leave-carry-forward
fix/leave-overlap-check
chore/update-engineering-docs
hotfix/leave-balance-calculation
```

## Commit Messages

```
feat(leave): add carry-forward year-end processing
fix(leave): correct overlap check for half-day requests
chore(docs): add engineering governance documents
feat(employees): add Emirates ID duplicate detection
refactor(api): extract query param parsing to shared util
```
