import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { HRAnalyticsClient } from "./HRAnalyticsClient";

export const metadata: Metadata = { title: "HR Analytics" };

export default function HRAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Analytics"
        description="Headcount trends, department breakdown, and workforce composition"
      />
      <HRAnalyticsClient />
    </div>
  );
}
