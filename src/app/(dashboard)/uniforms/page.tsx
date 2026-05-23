import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { UniformClient } from "./UniformClient";

export const metadata: Metadata = { title: "Uniforms" };

export default function UniformsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Uniforms" description="Manage stock inventory, issue uniforms to employees, and track returns" />
      <UniformClient />
    </div>
  );
}
