import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getAsset } from "@/modules/assets/queries";
import { Button } from "@/components/ui/button";
import { AssetDetailClient } from "@/components/modules/assets/AssetDetailClient";
import type { AssetDetailData } from "@/modules/assets/hooks";

export const metadata: Metadata = { title: "Asset Detail" };

type Props = { params: Promise<{ id: string }> };

export default async function AssetDetailPage({ params }: Props) {
  const { id } = await params;
  const { companyId } = await requireSession();
  const asset = await getAsset(id, companyId);

  if (!asset) notFound();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/assets">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Assets
        </Link>
      </Button>

      <AssetDetailClient asset={asset as unknown as AssetDetailData} />
    </div>
  );
}
