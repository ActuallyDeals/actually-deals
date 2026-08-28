import type { MetadataRoute } from "next";

import { listDeals } from "@/lib/server-db";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://actuallydeals.com";
  const deals = listDeals().map((deal) => ({
    url: `${site}/deal/${deal.slug}`,
    lastModified: new Date(deal.updatedAt),
  }));

  return [
    { url: site, lastModified: new Date() },
    { url: `${site}/about`, lastModified: new Date() },
    { url: `${site}/disclosure`, lastModified: new Date() },
    { url: `${site}/privacy`, lastModified: new Date() },
    ...deals,
  ];
}
