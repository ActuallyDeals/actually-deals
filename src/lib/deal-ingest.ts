import type { DealBullet, ParsedDealPackage, StackingStep } from "@/lib/types";
import {
  amazonCanonicalUrl,
  amazonCdnImage,
  detectMerchantFromUrl,
  extractAmazonAsin,
  injectAffiliate,
  publicDealUrl,
  stripTrackingParams,
} from "@/lib/affiliate";
import { computeDiscountPercent, formatMoney, parseMoney } from "@/lib/money";

const TRACKING_JUNK = /[?&](tag|ref|ref_|linkCode|linkId|ascsubtag|utm_[^=]+)=/i;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

export function merchantPlaceholderDataUri(merchantName: string): string {
  const label = merchantName.replace(/[<>&'"]/g, "") || "Deal";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <rect width="640" height="420" fill="#f1f5f9"/>
    <rect x="24" y="24" width="592" height="372" rx="28" fill="#ffffff" stroke="#e2e8f0"/>
    <text x="320" y="200" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="64">📦</text>
    <text x="320" y="268" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="28" fill="#475569" font-weight="700">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function buildHeadline(input: {
  title: string;
  dealPrice: number | null;
  msrp: number | null;
  discountPercent: number | null;
}): string {
  const price = formatMoney(input.dealPrice);
  const msrp = formatMoney(input.msrp);
  const name = input.title.trim() || "This item";

  if (price && msrp && input.discountPercent && input.discountPercent > 0) {
    return `${name} For Only ${price} (Reg. ${msrp}) After ${input.discountPercent}% Off!`;
  }
  if (price && msrp) {
    return `${name} For Only ${price} (Reg. ${msrp})`;
  }
  if (price) {
    return `${name} For Only ${price}`;
  }
  return name;
}

export function buildBullets(input: {
  merchantName: string;
  dealPrice: number | null;
  msrp: number | null;
  discountPercent: number | null;
  couponCode: string | null;
}): DealBullet[] {
  const price = formatMoney(input.dealPrice);
  const msrp = formatMoney(input.msrp);
  const priceText = price
    ? input.discountPercent && input.discountPercent > 0 && msrp
      ? `${price} vs ${msrp} listed — ${input.discountPercent}% off when the price is confirmed.`
      : `${price} at ${input.merchantName}. Confirm the live checkout total before you buy.`
    : `Price not scraped. Confirm the live ${input.merchantName} checkout total before publishing.`;

  const shippingText =
    input.merchantName === "Amazon"
      ? "Free Prime shipping when eligible. Watch for add-on item or remote-area exceptions."
      : `Check ${input.merchantName} shipping, store pickup, and any order-minimum threshold at checkout.`;

  const actionText = input.couponCode
    ? `Clip or enter code ${input.couponCode} on the product page, then confirm the final stacked price.`
    : "Open the deal, clip any on-page coupon, and confirm the final checkout price.";

  return [
    { kind: "price", label: "Price", text: priceText },
    { kind: "shipping", label: "Shipping", text: shippingText },
    { kind: "action", label: "How to get it", text: actionText },
  ];
}

export function buildStackingSteps(input: {
  merchantName: string;
  couponCode: string | null;
  dealPrice: number | null;
}): StackingStep[] {
  const price = formatMoney(input.dealPrice);
  return [
    {
      step: 1,
      title: `Open the ${input.merchantName} listing`,
      detail: "Use the outbound deal button so the cleaned affiliate URL is the one that gets tracked.",
    },
    {
      step: 2,
      title: input.couponCode ? `Clip or enter ${input.couponCode}` : "Clip the on-page coupon",
      detail: input.couponCode
        ? `Apply ${input.couponCode} before checkout. Do not stack extra codes unless the listing says they combine.`
        : "Clip any store coupon on the page. If a retailer blocks the clip, the deal may already be expired.",
    },
    {
      step: 3,
      title: price ? `Confirm ${price} at checkout` : "Confirm the live checkout price",
      detail:
        "The published price is only used when it was entered or scraped. If checkout differs, vote the deal expired.",
    },
  ];
}

export function buildSocialPost(input: {
  title: string;
  dealPrice: number | null;
  msrp: number | null;
  slug: string;
  couponCode: string | null;
}): string {
  const price = formatMoney(input.dealPrice);
  const msrp = formatMoney(input.msrp);
  const dealLink = publicDealUrl(input.slug);
  const clipLine = input.couponCode
    ? `Use code ${input.couponCode}`
    : "Clip coupon on page";

  const priceLine = price
    ? msrp
      ? `${input.title} is down to ${price} (Was ${msrp})!`
      : `${input.title} is ${price}!`
    : `${input.title} — confirm the live price on the listing.`;

  const post = `🚨 PRICE DROP: ${priceLine}\n\n${clipLine}\n\nGet it here: ${dealLink} #ad`;
  return post.length <= 280 ? post : `${post.slice(0, 277)}...`;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/");
}

function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const property = html.match(
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
    );
    if (property?.[1]) {
      return decodeHtml(property[1]);
    }
    const reversed = html.match(
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
        "i",
      ),
    );
    if (reversed?.[1]) {
      return decodeHtml(reversed[1]);
    }
  }
  return null;
}

function schemaPrice(html: string): { price: number | null; msrp: number | null } {
  const price = parseMoney(
    html.match(/"price"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/i)?.[1] ?? null,
  );
  const msrp = parseMoney(
    html.match(/"(?:listPrice|priceCurrency[^}]+lowPrice|msrp)"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)"?/i)?.[1] ??
      null,
  );
  return { price, msrp };
}

export async function parseDealUrl(rawUrl: string): Promise<ParsedDealPackage> {
  if (!rawUrl.trim() || !/^https?:\/\//i.test(rawUrl.trim())) {
    throw new Error("Paste a full product URL that starts with http or https.");
  }

  const cleanedUrl = stripTrackingParams(rawUrl.trim());
  const merchant = detectMerchantFromUrl(cleanedUrl);
  const asin = extractAmazonAsin(cleanedUrl);
  const canonicalUrl =
    merchant.slug === "amazon" && asin ? amazonCanonicalUrl(asin) : cleanedUrl;

  let title = "";
  let imageUrl = "";
  let imageSource: ParsedDealPackage["imageSource"] = "fallback";
  let dealPrice: number | null = null;
  let msrp: number | null = null;
  let pricesBlocked = false;
  let scrapeNote: string | null = null;

  try {
    const response = await fetch(canonicalUrl, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ActuallyDealsBot/1.0; +https://actuallydeals.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (response.status === 403 || response.status === 429) {
      pricesBlocked = true;
      scrapeNote =
        "Retailer blocked the scrape. Leave price and MSRP blank until you type the live checkout numbers.";
    } else if (!response.ok) {
      scrapeNote = `Retailer returned ${response.status}. Title and prices were not filled in.`;
    } else {
      const html = await response.text();
      title = metaContent(html, ["og:title", "twitter:title"]) ?? "";
      if (!title) {
        title = decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "");
      }
      imageUrl = metaContent(html, ["og:image", "twitter:image", "og:image:url"]) ?? "";
      if (imageUrl) {
        imageSource = "opengraph";
      }
      const schema = schemaPrice(html);
      dealPrice = schema.price;
      msrp = schema.msrp;
    }
  } catch {
    pricesBlocked = true;
    scrapeNote =
      "Could not reach the retailer (timeout, Cloudflare, or network). Prices stay blank on purpose.";
  }

  if (!imageUrl && asin) {
    imageUrl = amazonCdnImage(asin);
    imageSource = "amazon-cdn";
  }

  if (!imageUrl) {
    imageUrl = merchantPlaceholderDataUri(merchant.name);
    imageSource = "fallback";
  }

  const discountPercent = computeDiscountPercent(dealPrice, msrp);
  const headlineTitle = title || `${merchant.name} listing`;
  const slug = slugify(headlineTitle) || `deal-${Date.now()}`;

  return {
    sourceUrl: rawUrl.trim(),
    cleanedUrl,
    canonicalUrl,
    merchantName: merchant.name,
    merchantSlug: merchant.slug,
    asin,
    title: headlineTitle,
    imageUrl,
    imageSource,
    dealPrice,
    msrp,
    discountPercent,
    couponCode: null,
    headline: buildHeadline({
      title: headlineTitle,
      dealPrice,
      msrp,
      discountPercent,
    }),
    bullets: buildBullets({
      merchantName: merchant.name,
      dealPrice,
      msrp,
      discountPercent,
      couponCode: null,
    }),
    stackingSteps: buildStackingSteps({
      merchantName: merchant.name,
      couponCode: null,
      dealPrice,
    }),
    socialPost: buildSocialPost({
      title: headlineTitle,
      dealPrice,
      msrp,
      slug,
      couponCode: null,
    }),
    pricesBlocked,
    scrapeNote,
  };
}

export function trackingLooksDirty(url: string): boolean {
  return TRACKING_JUNK.test(url);
}

export function toAffiliateReadyUrl(url: string): string {
  return injectAffiliate(url);
}
