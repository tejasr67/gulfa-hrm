import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaintenanceClient } from "@/components/modules/assets/MaintenanceClient";

export const metadata: Metadata = { title: "Asset Maintenance" };

export default function MaintenancePage() {
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
        <h1 className="text-2xl font-bold">Maintenance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track scheduled and completed maintenance across all assets
        </p>
      </div>

      <MaintenanceClient />
    </div>
  );
}
