import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Disciplinary" };

export default function DisciplinaryPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Disciplinary Management" description="Track disciplinary actions, warnings, and appeals" />
      <Card>
        <CardHeader><CardTitle className="text-base">Disciplinary Records</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No disciplinary records</p>
            <p className="text-sm text-muted-foreground">Records will appear here once added.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
