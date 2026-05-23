import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getAccommodationStats } from "@/modules/accommodation/queries";
import { PageHeader } from "@/components/shared/PageHeader";
import { AccommodationClient } from "./AccommodationClient";

export const metadata: Metadata = { title: "Accommodation" };

export default async function AccommodationPage() {
  const { companyId } = await requireSession();
  const stats = await getAccommodationStats(companyId);

  return (
    <div className="space-y-6">
      <PageHeader title="Accommodation" description="Manage staff housing, room allocations, and occupancy" />
      <AccommodationClient initialStats={stats} />
    </div>
  );
}
