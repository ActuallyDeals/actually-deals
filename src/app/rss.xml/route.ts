import { listPublicDeals } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://actuallydeals.com";
  const deals = await listPublicDeals();
  const items = deals
    .slice(0, 30)
    .map((deal) => {
      return `<item>
        <title><![CDATA[${deal.title}]]></title>
        <link>${site}/deal/${deal.slug}</link>
        <guid>${site}/deal/${deal.slug}</guid>
        <pubDate>${new Date(deal.publishedAt ?? deal.createdAt).toUTCString()}</pubDate>
        <description><![CDATA[${deal.bullets.join(" ")}]]></description>
      </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Actually Deals</title>
      <link>${site}</link>
      <description>Human-verified shopping deals. Confirm the total at checkout.</description>
      ${items}
    </channel>
  </rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
