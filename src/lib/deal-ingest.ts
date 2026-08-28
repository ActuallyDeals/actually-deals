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

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

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
    <rect width="640" height="420" fill="#f8fafc"/>
    <rect x="28" y="28" width="584" height="364" rx="24" fill="#fff" stroke="#e2e8f0"/>
    <text x="320" y="230" text-anchor="middle" font-family="ui-sans-serif,system-ui" font-size="36" fill="#334155" font-weight="700">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function titleFromUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const path = decodeURIComponent(parsed.pathname);
    const amazon = path.match(/\/([^/]+)\/(?:dp|gp\/product)\//i);
    if (amazon?.[1] && !/^(dp|gp|d|product)$/i.test(amazon[1])) {
      return humanizeSlug(amazon[1]);
    }
    const last = path
      .split("/")
      .filter(Boolean)
      .filter((part) => !/^\d+$/.test(part) && !/^(ip|p|dp|gp|product)$/i.test(part))
      .at(-1);
    return last ? humanizeSlug(last.replace(/\.(html|htm)$/i, "")) : "";
  } catch {
    return "";
  }
}

function humanizeSlug(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function cleanProductTitle(title: string, merchantName: string): string {
  let next = decodeHtml(title).replace(/\s+/g, " ").trim();
  next = next.replace(/^Amazon\.com\s*:\s*/i, "");
  next = next.replace(/\s*[|:–-]\s*Amazon(?:\.com)?.*$/i, "");
  next = next.replace(/\s+at\s+Amazon(?:\.com)?$/i, "");
  next = next.replace(/\s*[|:–-]\s*Walmart(?:\.com)?.*$/i, "");
  next = next.replace(/\s*[|:–-]\s*Target.*$/i, "");
  next = next.replace(/\s*[|:–-]\s*Best Buy.*$/i, "");
  next = next.replace(/\s+at\s+The Home Depot.*$/i, "");
  next = next.replace(new RegExp(`^${merchantName}\\s*[–-]\\s*`, "i"), "");
  return next.trim();
}

export function buildHeadline(input: {
  title: string;
  merchantName?: string;
  dealPrice: number | null;
  msrp: number | null;
  discountPercent: number | null;
  couponCode?: string | null;
}): string {
  const name = input.title.trim() || "This item";
  const price = formatMoney(input.dealPrice);
  const code = input.couponCode ? ` w/ Code` : "";
  if (price) {
    return `${name} - ${price}${code}`;
  }
  return `${name}${code}`;
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
  const priceText =
    price && msrp && input.discountPercent
      ? `${price} (was ${msrp}) · ${input.discountPercent}% off`
      : price
        ? `${price} at ${input.merchantName}`
        : `See price at ${input.merchantName}`;

  const shippingText =
    input.merchantName === "Amazon"
      ? "Free Prime shipping on eligible orders."
      : `Check shipping or pickup at ${input.merchantName}.`;

  const actionText = input.couponCode
    ? `Apply code ${input.couponCode} at checkout.`
    : "Clip any on-page coupon, then check out.";

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
      detail: "Use the Get Deal button so you land on the cleaned product page.",
    },
    {
      step: 2,
      title: input.couponCode ? `Enter ${input.couponCode}` : "Clip the coupon if one is on the page",
      detail: input.couponCode
        ? `Add the item, then apply ${input.couponCode} before you pay.`
        : "If a store coupon is on the page, clip it before checkout.",
    },
    {
      step: 3,
      title: price ? `Confirm ${price} at checkout` : "Confirm the live checkout price",
      detail: "If the total does not match, mark the deal expired.",
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
  const clip = input.couponCode ? `Use code ${input.couponCode}` : "See the listing for any coupon";
  const line = price
    ? msrp
      ? `${input.title} is ${price} (was ${msrp})`
      : `${input.title} is ${price}`
    : input.title;
  const post = `${line}\n\n${clip}\n${dealLink} #ad`;
  return post.length <= 280 ? post : `${post.slice(0, 277)}...`;
}

export function previewFromUrl(rawUrl: string): {
  cleanedUrl: string;
  canonicalUrl: string;
  merchantName: string;
  merchantSlug: string;
  asin: string | null;
  title: string;
  imageUrl: string;
} {
  const cleanedUrl = stripTrackingParams(rawUrl.trim());
  const merchant = detectMerchantFromUrl(cleanedUrl);
  const asin = extractAmazonAsin(cleanedUrl);
  const canonicalUrl =
    merchant.slug === "amazon" && asin ? amazonCanonicalUrl(asin) : cleanedUrl;
  const title = titleFromUrl(cleanedUrl);
  const imageUrl = asin
    ? amazonCdnImage(asin)
    : merchantPlaceholderDataUri(merchant.name);

  return {
    cleanedUrl,
    canonicalUrl,
    merchantName: merchant.name,
    merchantSlug: merchant.slug,
    asin,
    title,
    imageUrl,
  };
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

function extractHtmlTitle(html: string): string {
  return decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "");
}

function extractImages(html: string): string[] {
  const found: string[] = [];
  const push = (value?: string | null) => {
    if (!value) {
      return;
    }
    const url = decodeHtml(value).replace(/&amp;/g, "&");
    if (/^https?:\/\//i.test(url) && !/logo|sprite|primebrand|transparent-pixel/i.test(url)) {
      found.push(url);
    }
  };
  push(metaContent(html, ["og:image", "og:image:url", "twitter:image"]));
  for (const match of html.matchAll(/data-old-hires="([^"]+)"/gi)) {
    push(match[1]);
  }
  for (const match of html.matchAll(/"hiRes"\s*:\s*"(https:[^"]+)"/gi)) {
    push(match[1]);
  }
  return found;
}

function extractPrices(html: string): { price: number | null; msrp: number | null } {
  const dollars = [...html.matchAll(/<span class="a-offscreen">\s*(\$[\d,]+(?:\.\d{2})?)\s*<\/span>/gi)]
    .map((match) => parseMoney(match[1]))
    .filter((value): value is number => value !== null && value > 0);

  const strike = [...html.matchAll(/a-text-price[^>]*>[\s\S]{0,120}?a-offscreen">\s*(\$[\d,]+(?:\.\d{2})?)/gi)]
    .map((match) => parseMoney(match[1]))
    .find((value): value is number => value !== null && value > 0);

  const jsonPrice = parseMoney(
    html.match(/"price"\s*:\s*"?([0-9]+(?:\.[0-9]{2})?)"?/i)?.[1] ??
      html.match(/itemprop="price"[^>]+content="([0-9.]+)"/i)?.[1] ??
      null,
  );
  const jsonList = parseMoney(
    html.match(/"listPrice"\s*:\s*"?([0-9]+(?:\.[0-9]{2})?)"?/i)?.[1] ?? null,
  );

  const price = jsonPrice ?? dollars[0] ?? null;
  const msrp = jsonList ?? (strike && price && strike > price ? strike : null);
  return { price, msrp };
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    if (html.length < 1500 && /captcha|robot check|continue shopping/i.test(html)) {
      return null;
    }
    return html;
  } catch {
    return null;
  }
}

async function fetchMicrolink(url: string): Promise<{ title: string; image: string } | null> {
  try {
    const response = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}`,
      { signal: AbortSignal.timeout(8000), cache: "no-store" },
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as {
      status?: string;
      data?: { title?: string; image?: { url?: string } | string };
    };
    if (payload.status !== "success" || !payload.data) {
      return null;
    }
    const image =
      typeof payload.data.image === "string"
        ? payload.data.image
        : payload.data.image?.url ?? "";
    return { title: payload.data.title ?? "", image };
  } catch {
    return null;
  }
}

export async function parseDealUrl(rawUrl: string): Promise<ParsedDealPackage> {
  if (!rawUrl.trim() || !/^https?:\/\//i.test(rawUrl.trim())) {
    throw new Error("Paste a full product link that starts with http or https.");
  }

  const preview = previewFromUrl(rawUrl);
  let title = preview.title;
  let imageUrl = preview.imageUrl;
  let imageSource: ParsedDealPackage["imageSource"] = preview.asin ? "amazon-cdn" : "fallback";
  let dealPrice: number | null = null;
  let msrp: number | null = null;
  let scrapeNote: string | null = null;

  const html = (await fetchHtml(preview.cleanedUrl)) ?? (await fetchHtml(preview.canonicalUrl));
  if (html) {
    const htmlTitle = cleanProductTitle(extractHtmlTitle(html) || metaContent(html, ["og:title", "twitter:title"]) || "", preview.merchantName);
    if (htmlTitle) {
      title = htmlTitle;
    }
    const images = extractImages(html);
    if (images[0]) {
      imageUrl = images[0];
      imageSource = "opengraph";
    }
    const prices = extractPrices(html);
    dealPrice = prices.price;
    msrp = prices.msrp;
  }

  if (!title || !dealPrice || imageSource === "fallback" || imageSource === "amazon-cdn") {
    const extra = await fetchMicrolink(preview.cleanedUrl);
    if (extra?.title && !title) {
      title = cleanProductTitle(extra.title, preview.merchantName);
    }
    if (extra?.image && (imageSource === "fallback" || !imageUrl.includes("media-amazon.com/images/I/"))) {
      if (!/logo|prime|sprite/i.test(extra.image)) {
        imageUrl = extra.image;
        imageSource = "opengraph";
      }
    }
  }

  if (!title) {
    title = `${preview.merchantName} deal`;
    scrapeNote = "Could not read the listing title. Edit it before you post.";
  }
  if (!imageUrl) {
    imageUrl = merchantPlaceholderDataUri(preview.merchantName);
    imageSource = "fallback";
  }

  const discountPercent = computeDiscountPercent(dealPrice, msrp);
  const slug = slugify(title) || `deal-${Date.now()}`;

  return {
    sourceUrl: rawUrl.trim(),
    cleanedUrl: preview.cleanedUrl,
    canonicalUrl: preview.canonicalUrl,
    merchantName: preview.merchantName,
    merchantSlug: preview.merchantSlug,
    asin: preview.asin,
    title,
    imageUrl,
    imageSource,
    dealPrice,
    msrp,
    discountPercent,
    couponCode: null,
    headline: buildHeadline({
      title,
      merchantName: preview.merchantName,
      dealPrice,
      msrp,
      discountPercent,
    }),
    bullets: buildBullets({
      merchantName: preview.merchantName,
      dealPrice,
      msrp,
      discountPercent,
      couponCode: null,
    }),
    stackingSteps: buildStackingSteps({
      merchantName: preview.merchantName,
      couponCode: null,
      dealPrice,
    }),
    socialPost: buildSocialPost({
      title,
      dealPrice,
      msrp,
      slug,
      couponCode: null,
    }),
    pricesBlocked: dealPrice === null,
    scrapeNote,
  };
}

export function toAffiliateReadyUrl(url: string): string {
  return injectAffiliate(url);
}
