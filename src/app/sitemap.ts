import type { MetadataRoute } from "next";
import { listPublicDeals } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://actuallydeals.com";
  const deals = await listPublicDeals();
  return [
    { url: site, lastModified: new Date() },
    { url: `${site}/disclosure`, lastModified: new Date() },
    { url: `${site}/privacy`, lastModified: new Date() },
    { url: `${site}/contact`, lastModified: new Date() },
    ...deals.map((deal) => ({
      url: `${site}/deal/${deal.slug}`,
      lastModified: new Date(deal.updatedAt),
    })),
  ];
}
