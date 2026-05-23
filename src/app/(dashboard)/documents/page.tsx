import type { Metadata } from "next";
import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { getDocumentStats } from "@/modules/documents/queries";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { DocumentsClient } from "./DocumentsClient";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const { companyId } = await requireSession();
  const stats = await getDocumentStats(companyId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track visa, Emirates ID, passport, labour card, and other employee documents
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/compliance">
            <ShieldCheck className="h-4 w-4 mr-1" />
            Compliance View
          </Link>
        </Button>
      </div>

      <DocumentsClient initialStats={stats} />
    </div>
  );
}
