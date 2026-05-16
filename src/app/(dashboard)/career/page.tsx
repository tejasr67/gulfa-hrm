import type { Metadata } from "next";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Career History" };

export default function CareerPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Career History" description="Track promotions, transfers, and role changes" />
      <Card>
        <CardHeader><CardTitle className="text-base">Career Events</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No career events</p>
            <p className="text-sm text-muted-foreground">Career history will appear here once recorded.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
