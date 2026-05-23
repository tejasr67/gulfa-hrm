import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { requireSession } from "@/lib/auth/session";
import { getCareerStats } from "@/modules/career/queries";
import { CareerClient } from "./CareerClient";

export const metadata: Metadata = { title: "Career History" };

export default async function CareerPage() {
  const { companyId } = await requireSession();
  const stats = await getCareerStats(companyId);
  return (
    <div className="space-y-6">
      <PageHeader title="Career History" description="Track promotions, transfers, salary revisions, and role changes" />
      <CareerClient initialStats={stats} />
    </div>
  );
}
