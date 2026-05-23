import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getBenefitStats } from "@/modules/benefits/queries";
import { BenefitsClient } from "./BenefitsClient";

export const metadata: Metadata = { title: "Benefits" };

export default async function BenefitsPage() {
  const { companyId } = await requireSession();
  const stats = await getBenefitStats(companyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Benefits Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track employee benefits, insurance, and perks
        </p>
      </div>
      <BenefitsClient initialStats={stats} />
    </div>
  );
}
