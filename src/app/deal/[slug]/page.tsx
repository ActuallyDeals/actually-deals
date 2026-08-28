import type { Metadata } from "next";

import { DealDetailView } from "@/components/deals/DealDetailView";
import { displayDealTitle } from "@/lib/deal-ingest";
import { findDeal, listDeals } from "@/lib/server-db";

type DealPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";
export const dynamicParams = true;

export function generateStaticParams() {
  return listDeals().map((deal) => ({ slug: deal.slug }));
}

export async function generateMetadata({ params }: DealPageProps): Promise<Metadata> {
  const { slug } = await params;
  const deal = findDeal(slug);
  if (!deal) {
    return { title: "Deal" };
  }
  return {
    title: displayDealTitle(deal),
    description: deal.bullets.map((bullet) => bullet.text).join(" "),
  };
}

export default async function DealPage({ params }: DealPageProps) {
  const { slug } = await params;
  return <DealDetailView slug={slug} initialDeal={findDeal(slug) ?? null} />;
}
