import type { Metadata } from "next";

import { DealDetailView } from "@/components/deals/DealDetailView";
import { getSeedDeal, SEED_DEALS } from "@/data/seed-deals";

type DealPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;

export function generateStaticParams() {
  return SEED_DEALS.map((deal) => ({ slug: deal.slug }));
}

export async function generateMetadata({ params }: DealPageProps): Promise<Metadata> {
  const { slug } = await params;
  const deal = getSeedDeal(slug);
  if (!deal) {
    return { title: "Deal" };
  }
  return {
    title: deal.title,
    description: deal.bullets.map((bullet) => bullet.text).join(" "),
  };
}

export default async function DealPage({ params }: DealPageProps) {
  const { slug } = await params;
  return <DealDetailView slug={slug} initialDeal={getSeedDeal(slug) ?? null} />;
}
