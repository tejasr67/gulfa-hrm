import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getDisciplinaryStats } from "@/modules/disciplinary/queries";
import { DisciplinaryClient } from "./DisciplinaryClient";

export const metadata: Metadata = { title: "Disciplinary" };

export default async function DisciplinaryPage() {
  const { companyId } = await requireSession();
  const stats = await getDisciplinaryStats(companyId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Disciplinary Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track disciplinary actions, warnings, and appeals
        </p>
      </div>
      <DisciplinaryClient initialStats={stats} />
    </div>
  );
}
