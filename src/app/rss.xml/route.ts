import { listPublicDeals } from "@/lib/store";

export const dynamic = "force-dynamic";

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function rssEnclosure(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "";
  if (imageUrl.includes("/placeholders/")) return "";
  if (!/^https?:\/\//i.test(imageUrl)) return "";
  const path = imageUrl.split("?")[0].split("#")[0];
  const type = path.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  return `<enclosure url="${escapeXmlAttr(imageUrl)}" type="${type}" />`;
}

export async function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://actuallydeals.com";
  const deals = await listPublicDeals();
  const items = deals
    .slice(0, 30)
    .map((deal) => {
      const enclosure = rssEnclosure(deal.imageUrl);
      return `<item>
        <title><![CDATA[${deal.title}]]></title>
        <link>${site}/deal/${deal.slug}</link>
        <guid>${site}/deal/${deal.slug}</guid>
        <pubDate>${new Date(deal.publishedAt ?? deal.createdAt).toUTCString()}</pubDate>
        <description><![CDATA[${deal.bullets.join(" ")}]]></description>
        ${enclosure}
      </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <title>Actually Deals</title>
      <link>${site}</link>
      <description>Deals that are actually good!</description>
      ${items}
    </channel>
  </rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
