"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { AssetCategoryItem } from "@/modules/assets/hooks";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "AVAILABLE", label: "Available" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "UNDER_MAINTENANCE", label: "Under Maintenance" },
  { value: "RESERVED", label: "Reserved" },
  { value: "DISPOSED", label: "Disposed" },
  { value: "LOST", label: "Lost" },
];

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  categoryId: string;
  onCategoryChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  categories: AssetCategoryItem[];
};

export function AssetFilters({
  search, onSearchChange,
  categoryId, onCategoryChange,
  status, onStatusChange,
  categories,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, code, serial…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <NativeSelect className="min-w-[160px]" value={categoryId} onChange={(e) => onCategoryChange(e.target.value)}>
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name} ({c._count.assets})</option>
        ))}
      </NativeSelect>
      <NativeSelect className="min-w-[160px]" value={status} onChange={(e) => onStatusChange(e.target.value)}>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </NativeSelect>
    </div>
  );
}
