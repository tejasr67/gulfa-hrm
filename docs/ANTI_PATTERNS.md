# Anti-Patterns to Avoid

> These patterns have caused bugs, security issues, or architectural drift in this codebase. Each one has a documented fix.

---

## Security Anti-Patterns

### ❌ Trusting `companyId` from User Input

```ts
// WRONG — attacker can pass any companyId
export async function getEmployees(companyId: string) {
  return prisma.employee.findMany({ where: { companyId } });
}

// WRONG — body-supplied companyId
const body = await request.json();
await getEmployees(body.companyId);
```

```ts
// CORRECT — always from session
const session = await requireSession();
return prisma.employee.findMany({ where: { companyId: session.companyId } });
```

---

### ❌ Skipping `requirePermission` for "Read-Only" Actions

```ts
// WRONG — reads can also be sensitive (payroll, documents)
export async function getPayrollData(raw: unknown) {
  const session = await requireSession();
  // Missing: requirePermission(session, "PAYROLL:VIEW")
  return prisma.payrollRecord.findMany({ ... });
}
```

```ts
// CORRECT
export async function getPayrollData(raw: unknown) {
  const session = await requireSession();
  requirePermission(session, "PAYROLL:VIEW");
  return prisma.payrollRecord.findMany({ ... });
}
```

---

### ❌ Using Client-Side `hasPermission` as a Security Gate

```ts
// WRONG — UI-only check used as actual authorization
const canApprove = hasPermission("LEAVE:APPROVE");
if (canApprove) {
  await processLeaveApproval(data);  // action will enforce permission itself
}
```

`hasPermission()` in the auth store is **UI-only** — it controls what the user sees, not what they can do. Server actions always enforce permissions independently.

---

### ❌ Missing `companyId` in Queries

```ts
// WRONG — tenant data leakage
const requests = await prisma.leaveRequest.findMany({
  where: { employeeId: filters.employeeId },  // no companyId — any tenant can see this
});
```

```ts
// CORRECT
const requests = await prisma.leaveRequest.findMany({
  where: { companyId: session.companyId, employeeId: filters.employeeId },
});
```

---

## Data Integrity Anti-Patterns

### ❌ Check-Then-Write Outside a Transaction (TOCTOU)

```ts
// WRONG — race condition: two requests can both pass the balance check
const balance = await prisma.leaveBalance.findFirst({ where: { employeeId } });
if (balance.remaining < days) throw new Error("Insufficient");
// GAP — another request can slip in here and also decrement the same balance
await prisma.leaveRequest.create({ ... });
await prisma.leaveBalance.update({ data: { remaining: { decrement: days } } });
```

```ts
// CORRECT — check and write inside a transaction with advisory lock
await prisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${employeeId}))`;
  const balance = await tx.leaveBalance.findFirst({ where: { employeeId } });
  if (!balance || balance.remaining < days) throw new Error("Insufficient");
  await tx.leaveRequest.create({ ... });
  await tx.leaveBalance.update({ ... });
});
```

---

### ❌ Awaiting `writeAuditLog`

```ts
// WRONG — blocks the response; audit log failure aborts the business operation
await writeAuditLog({ action: "LEAVE_APPROVED", ... });
return { success: true };
```

```ts
// CORRECT — fire and forget
void writeAuditLog({ action: "LEAVE_APPROVED", ... });
return { success: true };
```

---

### ❌ Throwing from Server Actions Instead of Returning Errors

```ts
// WRONG — unhandled throw surfaces as 500 to the client with no useful message
export async function approveLeave(raw: unknown) {
  const session = await requireSession();
  if (!isAuthorized) throw new Error("Not authorized to approve");  // WRONG
}
```

```ts
// CORRECT — always return { success: false, error }
export async function approveLeave(raw: unknown) {
  const session = await requireSession();
  if (!isAuthorized) return { success: false, error: "Not authorized to approve" };
}
```

---

## Prisma Anti-Patterns

### ❌ Instantiating `PrismaClient` Directly

```ts
// WRONG — creates a new connection pool on every import; causes connection exhaustion
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
```

```ts
// CORRECT — always import the singleton
import { prisma } from "@/lib/db";
```

---

### ❌ Using `.extend()` on a Refined Zod Schema

```ts
// WRONG — throws in Zod v4 if createLeaveRequestSchema has .refine()
const applySchema = createLeaveRequestSchema.extend({
  employeeId: z.string(),
});
```

```ts
// CORRECT — define a new schema with the fields you need
const applyLeaveInputSchema = z.object({
  leaveTypeId: z.string().min(1),
  employeeId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  // ...
});
```

---

### ❌ Writing Manual TypeScript Types for Prisma Models

```ts
// WRONG — will drift when the schema changes
type LeaveRequest = {
  id: string;
  employeeId: string;
  startDate: Date;
  // ... 20 more fields manually maintained
};
```

```ts
// CORRECT — derive from Prisma
import { Prisma } from "@prisma/client";
export type LeaveRequestWithRelations = Prisma.LeaveRequestGetPayload<{
  include: { employee: true; leaveType: true };
}>;
```

---

### ❌ Returning Raw Prisma Objects Without Specifying Select

```ts
// WRONG — leaks fields like salaryAmount, bankAccount, nationalId to the client
export async function getEmployee(id: string) {
  return prisma.employee.findUnique({ where: { id } });  // returns everything
}
```

```ts
// CORRECT — always specify select or a safe include shape
export async function getEmployee(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    select: {
      id: true, firstName: true, lastName: true,
      department: { select: { name: true } },
    },
  });
}
```

---

## React / Next.js Anti-Patterns

### ❌ Business Logic in Route Handlers

```ts
// WRONG — overlap check, balance check, and notification in the route handler
export async function POST(request: Request) {
  const session = await requireSession();
  const body = await request.json();

  // Business logic should NOT be here
  const overlaps = await prisma.leaveRequest.findMany({ ... });
  if (overlaps.length) return err("Overlapping leave");
  const balance = await prisma.leaveBalance.findFirst({ ... });
  if (balance.remaining < days) return err("Insufficient balance");
  const created = await prisma.leaveRequest.create({ ... });
  await sendEmail({ to: employee.email, ... });
  return ok(created);
}
```

```ts
// CORRECT — delegate entirely to the action
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const result = await applyForLeave(body);
    if (!result.success) return err(result.error ?? "Failed");
    return ok(result.data);
  } catch (e) {
    if (e instanceof Error && e.message === "Unauthorized") return unauthorized();
    return serverError(e);
  }
}
```

---

### ❌ Calling Server Actions from `hooks.ts`

```ts
// WRONG — server actions cannot be imported into client-side hooks files
// hooks.ts is for window.fetch calls only
import { getLeaveRequests } from "./actions";   // WRONG
```

```ts
// CORRECT — hooks call the API route, which calls the action
async function load() {
  const res = await window.fetch(`/api/leave/requests?employeeId=${employeeId}`);
}
```

---

### ❌ Shadowing `fetch` in Client Code

```ts
// WRONG — shadows the global fetch, causing subtle bugs
async function fetch() {   // WRONG name
  const res = await fetch(`/api/...`);  // calls itself infinitely
}
```

```ts
// CORRECT — use window.fetch and name the function something else
async function load() {
  const res = await window.fetch(`/api/...`);
}
```

---

### ❌ Using `"use client"` on a Page File

```tsx
// WRONG — forces the entire page subtree to be client-rendered
"use client";

export default async function LeavePage() {   // can't be async if "use client"
  const session = await requireSession();     // can't call server utilities
}
```

```tsx
// CORRECT — page is server component, client logic is in a *Client.tsx wrapper
// leave/page.tsx — no "use client"
export default async function LeavePage() {
  const session = await requireSession();
  const data = await getLeaveData(session.companyId);
  return <LeaveDashboardClient data={data} />;
}
```

---

### ❌ Date Fields as `z.coerce.date()` in Form Schemas

```ts
// WRONG — produces `unknown` type in Zod v4, breaks react-hook-form resolver
const schema = z.object({
  startDate: z.coerce.date(),
});
```

```ts
// CORRECT — use z.string() in the form schema, convert in onSubmit
const schema = z.object({
  startDate: z.string().min(1, "Start date is required"),
});

async function onSubmit(data: FormData) {
  await someAction({
    ...data,
    startDate: new Date(data.startDate),
  });
}
```

---

### ❌ Missing `AbortController` in `useEffect` Fetches

```ts
// WRONG — memory leak on component unmount
useEffect(() => {
  window.fetch("/api/...").then((r) => r.json()).then(setData);
}, []);
```

```ts
// CORRECT
useEffect(() => {
  const controller = new AbortController();
  window.fetch("/api/...", { signal: controller.signal })
    .then((r) => r.json())
    .then(setData)
    .catch((e) => { if (e.name !== "AbortError") setError(e.message); });
  return () => controller.abort();
}, []);
```

---

## Architecture Anti-Patterns

### ❌ Cross-Module Component Imports

```ts
// WRONG — leave components importing from employees components
// src/components/modules/leave/LeaveTable.tsx
import { EmployeeDocumentCard } from "@/components/modules/employees/EmployeeDocumentCard";
```

```ts
// CORRECT — promote to shared if needed by 2+ modules
import { SomeSharedCard } from "@/components/shared/SomeSharedCard";
```

---

### ❌ Defining Permission Strings Inline

```ts
// WRONG — typos, no autocomplete, no audit trail
requirePermission(session, "leave:approve");   // wrong casing
requirePermission(session, "LEAVE_APPROVE");   // wrong separator
```

```ts
// CORRECT — always from PERMISSIONS constant
import { PERMISSIONS } from "@/lib/utils/constants";
requirePermission(session, PERMISSIONS.LEAVE.APPROVE);
```

---

### ❌ Hardcoding UAE Business Rules

```ts
// WRONG — what if the company switches from Sun-Thu to Mon-Fri?
const workingDays = [0, 1, 2, 3, 4]; // Sun-Thu hardcoded
```

```ts
// CORRECT — read from WorkingDaysConfig
const config = await prisma.workingDaysConfig.findFirst({ where: { companyId } });
const workingDays = config?.workingDays ?? [0, 1, 2, 3, 4];
```

---

### ❌ Using `any` to Bypass Type Errors

```ts
// WRONG — masks real type errors
const result = (data as any).leaveType.name;
```

```ts
// CORRECT — fix the type definition
// If the query includes leaveType, the type should reflect that
type LeaveWithType = Prisma.LeaveRequestGetPayload<{ include: { leaveType: true } }>;
const result = (data as LeaveWithType).leaveType.name;
```

Exception: `zodResolver(formSchema) as any` is an accepted workaround for a known react-hook-form/Zod v4 typing issue. Document it with the eslint-disable comment.

---

### ❌ Pagination Without `count`

```ts
// WRONG — client can't paginate without knowing total
return prisma.leaveRequest.findMany({ take: 20, skip: 0 });
```

```ts
// CORRECT — always return total for paginated lists
const [items, total] = await Promise.all([
  prisma.leaveRequest.findMany({ take: 20, skip: 0 }),
  prisma.leaveRequest.count({ where }),
]);
return { items, total, page: 1, limit: 20 };
```

---

### ❌ Adding `companyId` to Schema Definitions Used in Server Actions

```ts
// WRONG — attackers can spoof companyId via form submission
const applyLeaveSchema = z.object({
  companyId: z.string(),   // NEVER include this
  employeeId: z.string(),
  leaveTypeId: z.string(),
});
```

```ts
// CORRECT — companyId comes from session only, never from client input
const applyLeaveSchema = z.object({
  employeeId: z.string(),
  leaveTypeId: z.string(),
  // companyId is injected in the action from session
});
```
