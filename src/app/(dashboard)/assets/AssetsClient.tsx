"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetStatsBar } from "@/components/modules/assets/AssetStatsBar";
import { AssetFilters } from "@/components/modules/assets/AssetFilters";
import { AssetGrid } from "@/components/modules/assets/AssetGrid";
import { AddAssetDialog } from "@/components/modules/assets/AddAssetDialog";
import { useAssets, useAssetCategories } from "@/modules/assets/hooks";
import type { AssetStats } from "@/modules/assets/types";

type Props = { initialStats: AssetStats };

export function AssetsClient({ initialStats }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");

  const { data: assets = [], isLoading, refetch } = useAssets({
    search: search || undefined,
    categoryId: categoryId || undefined,
    status: status || undefined,
  });
  const { data: categories = [] } = useAssetCategories();

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Asset Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track company assets, assignments, and maintenance
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Asset
        </Button>
      </div>

      <AssetStatsBar stats={initialStats} />

      <div className="rounded-xl border mt-6">
        <div className="border-b px-6 py-4">
          <AssetFilters
            search={search}
            onSearchChange={setSearch}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            status={status}
            onStatusChange={setStatus}
            categories={categories}
          />
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">Loading assets…</div>
        ) : (
          <AssetGrid assets={assets} onRefresh={handleRefresh} />
        )}
      </div>

      <AddAssetDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={handleRefresh}
      />
    </>
  );
}
