"use client";

import { useState, useCallback } from "react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Users, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { EmployeeFiltersPanel, type EmployeeFilters } from "./EmployeeFiltersPanel";
import { formatDate, getExpiryStatus } from "@/lib/utils/formatters";
import { useEmployees } from "@/modules/employees/hooks";
import type { EmployeeListItem } from "@/modules/employees/types";
import { cn } from "@/lib/utils/cn";
import type { BadgeProps } from "@/components/ui/badge";

type SortBy = "name" | "joiningDate" | "status" | "employeeId" | "department";
type SortOrder = "asc" | "desc";

function SortableHeader({
  label,
  sortKey,
  current,
  order,
  onSort,
}: {
  label: string;
  sortKey: SortBy;
  current: SortBy;
  order: SortOrder;
  onSort: (key: SortBy) => void;
}) {
  const active = current === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className="flex items-center gap-1 group select-none"
    >
      {label}
      <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
        {active ? (
          order === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
}

type Department = { id: string; name: string; parentId: string | null };
type Location = { id: string; name: string };

type Props = {
  departments: Department[];
  locations: Location[];
};

const DEFAULT_FILTERS: EmployeeFilters = {
  search: "",
  status: "",
  employmentType: "",
  departmentId: "",
  locationId: "",
  nationality: "",
  expiryStatus: "",
  includeArchived: false,
};

function docExpiryBadgeVariant(
  status: ReturnType<typeof getExpiryStatus>
): BadgeProps["variant"] {
  switch (status) {
    case "expired":
      return "danger";
    case "critical":
      return "warning";
    case "warning":
      return "info";
    case "ok":
      return "success";
    default:
      return "secondary";
  }
}

function getWorstExpiryStatus(
  ...dates: (Date | string | null | undefined)[]
): ReturnType<typeof getExpiryStatus> {
  const ORDER = ["expired", "critical", "warning", "ok", "none"] as const;
  let worst: ReturnType<typeof getExpiryStatus> = "none";
  for (const d of dates) {
    const s = getExpiryStatus(d);
    if (ORDER.indexOf(s) < ORDER.indexOf(worst)) {
      worst = s;
    }
  }
  return worst;
}

function DocumentExpiryCell({ row }: { row: { original: EmployeeListItem } }) {
  const { emiratesIdExpiry, visaExpiry, passportExpiry, laborCardExpiry } =
    row.original;
  const status = getWorstExpiryStatus(
    emiratesIdExpiry,
    visaExpiry,
    passportExpiry,
    laborCardExpiry
  );

  if (status === "none") {
    return <Badge variant="secondary">Not Set</Badge>;
  }

  const labels: Record<string, string> = {
    expired: "Expired",
    critical: "Expiring Soon",
    warning: "Due 60 Days",
    ok: "Valid",
  };

  return (
    <Badge variant={docExpiryBadgeVariant(status)}>
      {labels[status] ?? status}
    </Badge>
  );
}

function buildColumns(
  sortBy: SortBy,
  sortOrder: SortOrder,
  onSort: (key: SortBy) => void
): ColumnDef<EmployeeListItem>[] {
  return [
    {
      id: "employee",
      header: () => (
        <SortableHeader label="Employee" sortKey="name" current={sortBy} order={sortOrder} onSort={onSort} />
      ),
      cell: ({ row }) => {
        const { firstName, lastName, email, photo, id } = row.original;
        const isArchived = !!row.original.deletedAt;
        return (
          <div className={cn("flex items-center gap-3", isArchived && "opacity-60")}>
            <EmployeeAvatar
              firstName={firstName}
              lastName={lastName}
              photo={photo}
              size="sm"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/employees/${id}`}
                  className="font-medium hover:underline underline-offset-2 truncate max-w-[14rem]"
                >
                  {firstName} {lastName}
                </Link>
                {isArchived && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    Archived
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-[14rem]">
                {email}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "employeeId",
      header: () => (
        <SortableHeader label="ID" sortKey="employeeId" current={sortBy} order={sortOrder} onSort={onSort} />
      ),
      cell: ({ row }) => (
        <span
          className={cn(
            "font-mono text-xs text-muted-foreground",
            row.original.deletedAt && "opacity-60"
          )}
        >
          {row.original.employeeId}
        </span>
      ),
    },
    {
      id: "deptPosition",
      header: () => (
        <SortableHeader label="Department / Position" sortKey="department" current={sortBy} order={sortOrder} onSort={onSort} />
      ),
      cell: ({ row }) => {
        const { department, position, deletedAt } = row.original;
        return (
          <div className={cn("space-y-0.5", deletedAt && "opacity-60")}>
            <p className="text-sm">{department?.name ?? "—"}</p>
            {position?.title && (
              <p className="text-xs text-muted-foreground">{position.title}</p>
            )}
          </div>
        );
      },
    },
    {
      id: "status",
      header: () => (
        <SortableHeader label="Status" sortKey="status" current={sortBy} order={sortOrder} onSort={onSort} />
      ),
      cell: ({ row }) => {
        const isArchived = !!row.original.deletedAt;
        if (isArchived) {
          return <Badge variant="secondary">Archived</Badge>;
        }
        return <StatusBadge status={row.original.status} type="employee" />;
      },
    },
    {
      id: "documents",
      header: "Documents",
      cell: ({ row }) => <DocumentExpiryCell row={row} />,
    },
    {
      accessorKey: "joiningDate",
      header: () => (
        <SortableHeader label="Joined" sortKey="joiningDate" current={sortBy} order={sortOrder} onSort={onSort} />
      ),
      cell: ({ row }) => (
        <span
          className={cn(
            "text-sm",
            row.original.deletedAt && "opacity-60"
          )}
        >
          {formatDate(row.original.joiningDate)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/employees/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ];
}

export function EmployeeTable({ departments, locations }: Props) {
  const [filters, setFilters] = useState<EmployeeFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("joiningDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [limit, setLimit] = useState(25);

  const handleFiltersChange = useCallback((next: EmployeeFilters) => {
    setFilters(next);
    setPage(1);
  }, []);

  const handleSort = useCallback((key: SortBy) => {
    if (key === sortBy) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder("asc");
    }
    setPage(1);
  }, [sortBy]);

  const columns = buildColumns(sortBy, sortOrder, handleSort);

  // Map EmployeeFilters → useEmployees params (empty strings become undefined)
  const queryParams = {
    search: filters.search || undefined,
    status: (filters.status || undefined) as
      | "ACTIVE"
      | "ON_LEAVE"
      | "SUSPENDED"
      | "TERMINATED"
      | "PROBATION"
      | undefined,
    employmentType: (filters.employmentType || undefined) as
      | "FULL_TIME"
      | "PART_TIME"
      | "CONTRACT"
      | "INTERN"
      | "FREELANCE"
      | undefined,
    departmentId: filters.departmentId || undefined,
    locationId: filters.locationId || undefined,
    nationality: filters.nationality || undefined,
    expiryStatus: (filters.expiryStatus || undefined) as
      | "expired"
      | "expiring_soon"
      | undefined,
    includeArchived: filters.includeArchived || undefined,
    sortBy,
    sortOrder,
    limit,
    page,
  };

  const { data, isLoading, error } = useEmployees(queryParams);

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
  });

  const totalCount = data?.total ?? 0;

  return (
    <div className="space-y-4">
      {/* Filters + count */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <EmployeeFiltersPanel
              filters={filters}
              onChange={handleFiltersChange}
              departments={departments}
              locations={locations}
            />
          </div>
          {!isLoading && (
            <div className="shrink-0 pt-2">
              <span className="text-sm text-muted-foreground tabular-nums">
                {totalCount.toLocaleString()} employee{totalCount !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && !isLoading && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className={cn(
                            "h-4 rounded animate-pulse bg-muted",
                            j === 0 ? "w-40" : j === 1 ? "w-16" : "w-24"
                          )}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-0">
                    <EmptyState
                      icon={Users}
                      title="No employees found"
                      description={
                        filters.search ||
                        filters.status ||
                        filters.departmentId ||
                        filters.locationId ||
                        filters.employmentType ||
                        filters.expiryStatus
                          ? "Try adjusting your filters."
                          : "Add your first employee to get started."
                      }
                    />
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const isArchived = !!row.original.deletedAt;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b transition-colors hover:bg-muted/30",
                        isArchived && "opacity-60"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && (data.totalPages > 1 || data.total > 0) && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={String(limit)}
              onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground tabular-nums">
                {((page - 1) * data.limit + 1).toLocaleString()}–
                {Math.min(page * data.limit, data.total).toLocaleString()} of{" "}
                {data.total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground tabular-nums px-1">
                  {page} / {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === data.totalPages || isLoading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
