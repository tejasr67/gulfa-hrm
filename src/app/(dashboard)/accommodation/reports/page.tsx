import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getOccupancyReport, getAccommodationStats } from "@/modules/accommodation/queries";
import { AccommodationReportsClient } from "./AccommodationReportsClient";
import type { OccupancyPropertyReport } from "@/modules/accommodation/hooks";

export const metadata: Metadata = { title: "Accommodation Reports" };

export default async function AccommodationReportsPage() {
  const { companyId } = await requireSession();
  const [report, stats] = await Promise.all([
    getOccupancyReport(companyId),
    getAccommodationStats(companyId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/accommodation" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Accommodation
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Occupancy Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Real-time occupancy across all properties</p>
      </div>
      <AccommodationReportsClient initialReport={report as unknown as OccupancyPropertyReport[]} initialStats={stats} />
    </div>
  );
}
