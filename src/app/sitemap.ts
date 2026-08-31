import type { MetadataRoute } from "next";
import { listPublishedDeals } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://actuallydeals.com";
  const deals = await listPublishedDeals();
  return [
    { url: site, lastModified: new Date() },
    { url: `${site}/about`, lastModified: new Date() },
    { url: `${site}/disclosure`, lastModified: new Date() },
    { url: `${site}/privacy`, lastModified: new Date() },
    { url: `${site}/contact`, lastModified: new Date() },
    { url: `${site}/learn`, lastModified: new Date() },
    { url: `${site}/learn/how-we-pick`, lastModified: new Date() },
    { url: `${site}/learn/how-stacking-works`, lastModified: new Date() },
    ...deals.map((deal) => ({
      url: `${site}/deal/${deal.slug}`,
      lastModified: new Date(deal.updatedAt),
    })),
  ];
}
