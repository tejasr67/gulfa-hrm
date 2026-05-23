import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssetReportsClient } from "@/components/modules/assets/AssetReportsClient";

export const metadata: Metadata = { title: "Asset Reports" };

export default function AssetReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/assets">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Assets
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Asset Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Asset utilization, category breakdown, and depreciation analysis
        </p>
      </div>

      <AssetReportsClient />
    </div>
  );
}
