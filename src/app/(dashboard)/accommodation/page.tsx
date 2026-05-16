import type { Metadata } from "next";
import { Home } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Accommodation" };

export default function AccommodationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Accommodation"
        description="Manage staff housing, room allocations, and occupancy"
      />
      <Card>
        <CardHeader><CardTitle className="text-base">Accommodations</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Home className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No accommodations</p>
            <p className="text-sm text-muted-foreground">Add accommodation properties to get started.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
