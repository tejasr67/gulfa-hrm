"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Filter, X, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

export type EmployeeFilters = {
  search: string;
  status: string;
  employmentType: string;
  departmentId: string;
  locationId: string;
  nationality: string;
  expiryStatus: string;
  includeArchived: boolean;
};

type Department = { id: string; name: string; parentId: string | null };
type Location = { id: string; name: string };

type Props = {
  filters: EmployeeFilters;
  onChange: (filters: EmployeeFilters) => void;
  departments: Department[];
  locations: Location[];
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "TERMINATED", label: "Terminated" },
  { value: "PROBATION", label: "Probation" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
  { value: "FREELANCE", label: "Freelance" },
];

const EXPIRY_STATUS_OPTIONS = [
  { value: "expired", label: "Expired" },
  { value: "expiring_soon", label: "Expiring Soon" },
];

function countActiveFilters(filters: EmployeeFilters): number {
  let count = 0;
  if (filters.status) count++;
  if (filters.employmentType) count++;
  if (filters.departmentId) count++;
  if (filters.locationId) count++;
  if (filters.nationality) count++;
  if (filters.expiryStatus) count++;
  if (filters.includeArchived) count++;
  return count;
}

type ChipDef = {
  key: keyof EmployeeFilters;
  label: string;
};

function buildActiveChips(
  filters: EmployeeFilters,
  departments: Department[],
  locations: Location[]
): ChipDef[] {
  const chips: ChipDef[] = [];

  if (filters.status) {
    const found = STATUS_OPTIONS.find((o) => o.value === filters.status);
    chips.push({ key: "status", label: `Status: ${found?.label ?? filters.status}` });
  }
  if (filters.employmentType) {
    const found = EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === filters.employmentType);
    chips.push({
      key: "employmentType",
      label: `Type: ${found?.label ?? filters.employmentType}`,
    });
  }
  if (filters.departmentId) {
    const found = departments.find((d) => d.id === filters.departmentId);
    chips.push({
      key: "departmentId",
      label: `Dept: ${found?.name ?? filters.departmentId}`,
    });
  }
  if (filters.locationId) {
    const found = locations.find((l) => l.id === filters.locationId);
    chips.push({
      key: "locationId",
      label: `Location: ${found?.name ?? filters.locationId}`,
    });
  }
  if (filters.nationality) {
    chips.push({ key: "nationality", label: `Nationality: ${filters.nationality}` });
  }
  if (filters.expiryStatus) {
    const found = EXPIRY_STATUS_OPTIONS.find((o) => o.value === filters.expiryStatus);
    chips.push({
      key: "expiryStatus",
      label: `Expiry: ${found?.label ?? filters.expiryStatus}`,
    });
  }
  if (filters.includeArchived) {
    chips.push({ key: "includeArchived", label: "Including Archived" });
  }

  return chips;
}

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

export function EmployeeFiltersPanel({
  filters,
  onChange,
  departments,
  locations,
}: Props) {
  const [panelOpen, setPanelOpen] = useState(false);

  const activeFilterCount = countActiveFilters(filters);
  const activeChips = buildActiveChips(filters, departments, locations);

  const update = useCallback(
    (partial: Partial<EmployeeFilters>) => {
      onChange({ ...filters, ...partial });
    },
    [filters, onChange]
  );

  function removeChip(key: keyof EmployeeFilters) {
    const reset: Partial<EmployeeFilters> = {};
    if (key === "includeArchived") {
      (reset as { includeArchived: boolean }).includeArchived = false;
    } else {
      (reset as Record<string, string>)[key as string] = "";
    }
    onChange({ ...filters, ...reset });
  }

  function clearAll() {
    onChange({ ...DEFAULT_FILTERS, search: filters.search });
  }

  return (
    <div className="space-y-3">
      {/* Row 1: Search + toggle */}
      <div className="flex gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search employees..."
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Filters toggle button */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setPanelOpen((prev) => !prev)}
          className={cn(
            "gap-2 shrink-0",
            activeFilterCount > 0 && "border-primary/50 text-primary"
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs rounded-full">
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
              panelOpen && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Row 2: Advanced filters panel */}
      {panelOpen && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Status */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(v) => update({ status: v === "__all__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employment Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Employment Type
              </label>
              <Select
                value={filters.employmentType}
                onValueChange={(v) => update({ employmentType: v === "__all__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All types</SelectItem>
                  {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Department
              </label>
              <Select
                value={filters.departmentId}
                onValueChange={(v) => update({ departmentId: v === "__all__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Location
              </label>
              <Select
                value={filters.locationId}
                onValueChange={(v) => update({ locationId: v === "__all__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All locations</SelectItem>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Expiry */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Document Expiry
              </label>
              <Select
                value={filters.expiryStatus}
                onValueChange={(v) => update({ expiryStatus: v === "__all__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any expiry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Any expiry</SelectItem>
                  {EXPIRY_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip.key)}
                className="ml-0.5 rounded-full hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                aria-label={`Remove filter: ${chip.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-destructive underline-offset-2 hover:underline transition-colors focus-visible:outline-none"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Row 4: Include archived checkbox */}
      <label className="flex items-center gap-2 cursor-pointer w-fit group">
        <input
          type="checkbox"
          checked={filters.includeArchived}
          onChange={(e) => update({ includeArchived: e.target.checked })}
          className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
        />
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors select-none">
          Include archived employees
        </span>
      </label>
    </div>
  );
}
