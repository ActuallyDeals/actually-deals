import { listDeals } from "@/lib/server-db";
import { displayDealTitle } from "@/lib/deal-ingest";

export const dynamic = "force-dynamic";

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://actuallydeals.com";
  const items = listDeals()
    .slice(0, 30)
    .map((deal) => {
      const title = displayDealTitle(deal);
      return `<item>
        <title><![CDATA[${title}]]></title>
        <link>${site}/deal/${deal.slug}</link>
        <guid>${site}/deal/${deal.slug}</guid>
        <pubDate>${new Date(deal.createdAt).toUTCString()}</pubDate>
        <description><![CDATA[${deal.bullets.map((b) => b.text).join(" ")}]]></description>
      </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Actually Deals</title>
      <link>${site}</link>
      <description>Today's hottest freebies and price drops</description>
      ${items}
    </channel>
  </rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
