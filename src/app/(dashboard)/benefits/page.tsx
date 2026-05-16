import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Benefits" };

export default function BenefitsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Benefits Management" description="Track employee benefits, insurance, and perks" />
      <Card>
        <CardHeader><CardTitle className="text-base">Benefits</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Heart className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No benefits configured</p>
            <p className="text-sm text-muted-foreground">Configure benefit types to start tracking.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
