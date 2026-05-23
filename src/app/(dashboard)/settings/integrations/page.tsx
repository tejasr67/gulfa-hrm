import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { IntegrationsClient } from "./IntegrationsClient";

export const metadata: Metadata = { title: "API Integrations" };

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="API Integrations"
        description="Manage API keys, webhook endpoints, and external integrations"
      />
      <IntegrationsClient />
    </div>
  );
}
