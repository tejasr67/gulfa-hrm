import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { getCarryForwardSummary } from "@/modules/leave/queries";
import { CarryForwardClient } from "./CarryForwardClient";

export const metadata: Metadata = { title: "Leave Carry Forward" };

export default async function CarryForwardPage() {
  const session = await requireSession();
  const year = new Date().getFullYear() - 1;
  const summary = await getCarryForwardSummary(session.companyId, year);
  return <CarryForwardClient initialSummary={summary} fromYear={year} />;
}
