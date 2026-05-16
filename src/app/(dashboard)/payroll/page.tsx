import type { Metadata } from "next";
import { DollarSign } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Payroll" };

export default function PayrollPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Process monthly payroll, view payslips, and manage salary structures"
        actions={<Button>Run Payroll</Button>}
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payroll Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No payroll runs</p>
            <p className="text-sm text-muted-foreground">
              Connect your database and run your first payroll.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
