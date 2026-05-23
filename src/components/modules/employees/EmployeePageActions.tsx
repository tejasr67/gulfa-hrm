"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BulkImportDialog } from "./BulkImportDialog";
import { AddEmployeeDialog } from "./AddEmployeeDialog";

export function EmployeePageActions() {
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setImportOpen(true)}>
        <Upload className="h-4 w-4" />
        Bulk Import
      </Button>
      <Button onClick={() => setAddOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Add Employee
      </Button>

      <BulkImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={handleSuccess}
      />
      <AddEmployeeDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={handleSuccess}
      />
    </>
  );
}
