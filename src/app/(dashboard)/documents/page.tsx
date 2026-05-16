import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Document Expiry" };

const EXPIRY_STATS = [
  { label: "Expired", value: "—", variant: "danger" as const },
  { label: "Expiring in 30 days", value: "—", variant: "warning" as const },
  { label: "Expiring in 60 days", value: "—", variant: "info" as const },
  { label: "Valid", value: "—", variant: "success" as const },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Expiry Tracking"
        description="Monitor visa, Emirates ID, passport, and labour card expiries"
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {EXPIRY_STATS.map(({ label, value, variant }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{value}</p>
              <Badge variant={variant} className="mt-1 text-[10px]">
                {label}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No documents</p>
            <p className="text-sm text-muted-foreground">
              Documents will appear here once employees are added.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
