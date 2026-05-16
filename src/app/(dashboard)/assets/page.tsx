import type { Metadata } from "next";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Asset Management" };

export default function AssetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Management"
        description="Track company assets, assignments, and maintenance"
        actions={<Button>Add Asset</Button>}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No assets</p>
            <p className="text-sm text-muted-foreground">
              Add your first asset to start tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
