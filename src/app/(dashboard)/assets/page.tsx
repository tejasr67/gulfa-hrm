import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Wrench, BarChart2 } from "lucide-react";
import { getAssetStats } from "@/modules/assets/queries";
import { AssetsClient } from "./AssetsClient";

export const metadata: Metadata = { title: "Asset Management" };

export default async function AssetsPage() {
  const { companyId } = await requireSession();
  const stats = await getAssetStats(companyId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/assets/maintenance">
              <Wrench className="h-4 w-4" />
              Maintenance
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/assets/reports">
              <BarChart2 className="h-4 w-4" />
              Reports
            </Link>
          </Button>
        </div>
      </div>

      <AssetsClient initialStats={stats} />
    </div>
  );
}
