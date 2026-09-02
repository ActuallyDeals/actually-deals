import * as cheerio from "cheerio";
import { attachAffiliate, cleanTrackingParams, withHttps } from "@/lib/affiliate";
import { isRetailerShortUrl } from "@/lib/outbound";
import { buildDanBullets, buildStackingSteps, discountPercent } from "@/lib/copy-engine";
import { parseMoney } from "@/lib/format";
import { cdnImageFor, preferProductPhoto, resolveDealImage } from "@/lib/images";
import { giftCardFaceValue } from "@/lib/pricing";
import {
  detectMerchant,
  extractMerchantProductId,
  merchantLabel,
} from "@/lib/merchants";
import type { Merchant, ParsedDeal } from "@/lib/types";

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 1_500_000;

const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
};

export class ParseDealError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "ParseDealError";
  }
}

function isBlockedDestination(url: string, html?: string): boolean {
  try {
    const parsed = new URL(url);
    if (/blocked|captcha|challenge|px-captcha|incident|accessdenied/i.test(parsed.pathname)) {
      return true;
    }
  } catch {
    // ignore
  }
  if (!html) return false;
  const head = html.slice(0, 4000);
  return /robot or human|are you a robot|pardon our interruption|access denied|px-captcha/i.test(
    head,
  );
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) throw new ParseDealError("Paste a product URL to parse.");
  const withProtocol = withHttps(trimmed);
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new ParseDealError("That does not look like a valid URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ParseDealError("Only http(s) product links are supported.");
  }
  return url.toString();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return decodeHtml(value.trim());
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
      return decodeHtml(value[0].trim());
    }
    if (value && typeof value === "object" && "@id" in value) {
      const id = (value as { "@id"?: unknown })["@id"];
      if (typeof id === "string" && id.startsWith("http")) return id;
    }
  }
  return null;
}

function collectJsonLd($: cheerio.CheerioAPI): Record<string, unknown>[] {
  const nodes: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    if (!raw.trim()) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      const stack = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of stack) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        nodes.push(record);
        const graph = record["@graph"];
        if (Array.isArray(graph)) {
          for (const node of graph) {
            if (node && typeof node === "object") nodes.push(node as Record<string, unknown>);
          }
        }
      }
    } catch {
      // Retailers occasionally emit invalid JSON-LD. Ignore and continue.
    }
  });
  return nodes;
}

function productNodes(nodes: Record<string, unknown>[]): Record<string, unknown>[] {
  return nodes.filter((node) => {
    const type = node["@type"];
    if (typeof type === "string") return /product/i.test(type);
    if (Array.isArray(type)) return type.some((t) => typeof t === "string" && /product/i.test(t));
    return false;
  });
}

function offerPrice(offer: unknown): { current: number | null; list: number | null } {
  if (!offer) return { current: null, list: null };
  const node = (Array.isArray(offer) ? offer[0] : offer) as Record<string, unknown> | undefined;
  if (!node || typeof node !== "object") return { current: null, list: null };
  return {
    current: parseMoney(node.price ?? node.lowPrice),
    list: parseMoney(node.highPrice),
  };
}

function largestDynamicImage(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    let best: { url: string; area: number } | null = null;
    for (const [url, dims] of Object.entries(parsed)) {
      const pair = Array.isArray(dims) ? dims : [];
      const area = Number(pair[0] ?? 0) * Number(pair[1] ?? 0);
      if (!best || area > best.area) best = { url, area };
    }
    return best?.url ?? null;
  } catch {
    return null;
  }
}

export function extractFromHtml(html: string, merchant: Merchant): {
  title: string | null;
  currentPrice: number | null;
  listPrice: number | null;
  scrapedImageUrl: string | null;
} {
  const $ = cheerio.load(html);
  const jsonLd = collectJsonLd($);
  const products = productNodes(jsonLd);
  const product = products[0];

  let title: string | null = null;
  let currentPrice: number | null = null;
  let listPrice: number | null = null;
  let jsonLdImage: string | null = null;

  if (product) {
    title = firstString(product.name, product.title);
    jsonLdImage = firstString(
      typeof product.image === "string" ? product.image : undefined,
      Array.isArray(product.image) ? product.image[0] : undefined,
      product.image && typeof product.image === "object"
        ? (product.image as { url?: string }).url
        : undefined,
    );
    const priced = offerPrice(product.offers);
    currentPrice = priced.current;
    listPrice = priced.list;
  }

  title =
    title ??
    firstString(
      $('meta[property="og:title"]').attr("content"),
      $('meta[name="twitter:title"]').attr("content"),
      $("#productTitle").text(),
      $("h1").first().text(),
      $("title").text(),
    );

  const imageCandidates = [
    $("#landingImage").attr("data-old-hires"),
    $("img[data-old-hires]").attr("data-old-hires"),
    largestDynamicImage($("#landingImage").attr("data-a-dynamic-image")),
    $("img[data-a-dynamic-image]").attr("data-old-hires"),
    jsonLdImage,
    $('meta[property="og:image:secure_url"]').attr("content"),
    $('meta[property="og:image"]').attr("content"),
    $('meta[name="twitter:image"]').attr("content"),
    $("#landingImage").attr("src"),
    $("img.prod-hero-image-image").attr("src"),
    $('img[data-test="@web/ProductPage/ProductImage"]').attr("src"),
  ];
  let scrapedImageUrl: string | null = null;
  for (const candidate of imageCandidates) {
    const picked = preferProductPhoto(firstString(candidate));
    if (picked) {
      scrapedImageUrl = picked;
      break;
    }
  }

  currentPrice =
    currentPrice ??
    parseMoney($('meta[property="og:price:amount"]').attr("content")) ??
    parseMoney($('meta[property="product:price:amount"]').attr("content")) ??
    parseMoney($(".a-price .a-offscreen").first().text()) ??
    parseMoney($('[data-testid="price-wrap"] [data-testid="price"]').first().text()) ??
    parseMoney($('[data-test="product-price"]').first().text()) ??
    parseMoney($(".price-format__main-price").first().text()) ??
    parseMoney($(".priceView-hero-price span").first().text());

  listPrice =
    listPrice ??
    parseMoney($(".a-price.a-text-price .a-offscreen").first().text()) ??
    parseMoney($('[data-testid="list-price"]').first().text()) ??
    parseMoney($(".priceView-price-reg").first().text());

  if (listPrice != null && currentPrice != null && listPrice <= currentPrice) {
    listPrice = null;
  }

  if (merchant === "amazon") {
    title = title?.replace(/\s+Amazon\.com\s*:/i, "").replace(/^Amazon\.com\s*:\s*/i, "") ?? title;
  }

  if (title) {
    title = title.replace(/\s*[|\-–].{0,40}(Amazon|Walmart|Target|Home Depot|Best Buy|Newegg|eBay|Kohl'?s|Dick'?s|Office Depot|Costco|Uber|DoorDash|Grubhub|Postmates).*$/i, "").trim();
  }

  return { title, currentPrice, listPrice, scrapedImageUrl };
}

async function fetchMicrolink(url: string): Promise<{ title: string; image: string } | null> {
  try {
    const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      status?: string;
      data?: { title?: string; image?: { url?: string } | string };
    };
    if (payload.status !== "success" || !payload.data) return null;
    const image =
      typeof payload.data.image === "string"
        ? payload.data.image
        : payload.data.image?.url ?? "";
    return { title: payload.data.title ?? "", image };
  } catch {
    return null;
  }
}

/** Follow retailer short links (amzn.to, a.co, …) to a product URL. Does not invent an ASIN. */
export async function unwrapRetailerUrl(rawUrl: string): Promise<string> {
  let current = rawUrl;
  for (let step = 0; step < 6; step += 1) {
    const merchant = detectMerchant(current);
    if (merchant !== "other" && extractMerchantProductId(current, merchant)) return current;
    if (!isRetailerShortUrl(current) && step > 0) return current;
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(5000),
      });
      const location = response.headers.get("location");
      if (!location) return response.url && response.url !== current ? response.url : current;
      current = new URL(location, current).toString();
    } catch {
      return current;
    }
  }
  return current;
}

export async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const slice = buffer.byteLength > MAX_HTML_BYTES ? buffer.slice(0, MAX_HTML_BYTES) : buffer;
    const html = new TextDecoder("utf-8").decode(slice);
    return { html, finalUrl: response.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function humanizeSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/\.p$/i, "")
    .replace(/[-_+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseProductName(value: string): string {
  return value
    .split(" ")
    .map((word, index) => {
      if (!word) return word;
      if (/^e-?gift$/i.test(word)) return "eGift";
      if (index > 0 && /^(and|or|of|the|at|in|for)$/i.test(word)) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function displaySlugTitle(slug: string): string {
  const raw = humanizeSlug(slug);
  if (!raw) return raw;
  const compact = slug.replace(/[-_+/]/g, "");
  if (/[A-Z]/.test(compact)) return raw;
  return titleCaseProductName(raw);
}

export function looksLikeChallengeCopy(value: string | null | undefined): boolean {
  if (!value) return false;
  return /robot or human|are you a robot|access denied|pardon our|just a moment|attention required|px-captcha|blocked/i.test(
    value,
  );
}

/** Best-effort title from the product path when the retailer hides the page. Never a price. */
export function titleFromProductUrl(
  url: string,
  merchant: Merchant,
  productId: string | null,
): string | null {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (merchant === "walmart") {
      const ip = parts.indexOf("ip");
      if (ip >= 0 && parts[ip + 1] && parts[ip + 1] !== productId) {
        return displaySlugTitle(parts[ip + 1]);
      }
    }
    if (merchant === "target") {
      const p = parts.indexOf("p");
      if (p >= 0 && parts[p + 1] && parts[p + 1] !== "-") return displaySlugTitle(parts[p + 1]);
    }
    if (merchant === "home-depot") {
      const p = parts.indexOf("p");
      if (p >= 0 && parts[p + 1] && !/^\d+$/.test(parts[p + 1])) return displaySlugTitle(parts[p + 1]);
    }
    if (merchant === "best-buy") {
      const site = parts.indexOf("site");
      if (site >= 0 && parts[site + 1] && !/\.p$/i.test(parts[site + 1])) {
        return displaySlugTitle(parts[site + 1]);
      }
    }
    if (
      merchant === "costco" ||
      merchant === "newegg" ||
      merchant === "ebay" ||
      merchant === "kohls" ||
      merchant === "dicks" ||
      merchant === "office-depot" ||
      merchant === "booking" ||
      merchant === "expedia" ||
      merchant === "hotels" ||
      merchant === "priceline"
    ) {
      const skip = new Set(["p", "-", "itm", "product", "products", "a"]);
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const raw = parts[i].replace(/\.(?:html|jsp|aspx|product).*$/i, "");
        if (productId && (raw === productId || raw.toLowerCase() === productId.toLowerCase())) continue;
        if (productId && raw.includes(productId)) continue;
        if (skip.has(raw.toLowerCase())) continue;
        if (/^prd-\d+$/i.test(raw)) continue;
        if (/^(N82E\d+|9SI[A-Z0-9]+)$/i.test(raw)) continue;
        if (/^\d+$/.test(raw)) continue;
        const seg = displaySlugTitle(raw);
        if (seg.length > 3) return seg;
      }
    }
    if (merchant === "amazon") {
      const dp = parts.findIndex((part) => part === "dp" || part === "gp");
      if (dp > 0) return displaySlugTitle(parts[dp - 1]);
    }
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const seg = displaySlugTitle(parts[i]);
      if (!seg || (productId && parts[i].replace(/\.p$/i, "") === productId)) continue;
      if (/^\d+$/.test(seg) || /^[A-Z0-9]{10}$/i.test(parts[i])) continue;
      if (seg.length > 3) return seg;
    }
  } catch {
    // ignore
  }
  return null;
}

function fallbackTitle(merchant: Merchant, productId: string | null, url: string): string {
  const fromPath = titleFromProductUrl(url, merchant, productId);
  if (fromPath) return fromPath;
  if (productId) {
    const labels: Record<Merchant, string> = {
      amazon: `Amazon listing ${productId}`,
      walmart: `Walmart item ${productId}`,
      target: `Target TCIN ${productId}`,
      "home-depot": `Home Depot SKU ${productId}`,
      "best-buy": `Best Buy SKU ${productId}`,
      costco: `Costco item ${productId}`,
      newegg: `Newegg item ${productId}`,
      ebay: `eBay item ${productId}`,
      kohls: `Kohl's item ${productId}`,
      dicks: `Dick's item ${productId}`,
      "office-depot": `Office Depot item ${productId}`,
      booking: `Booking.com listing ${productId}`,
      expedia: `Expedia listing ${productId}`,
      hotels: `Hotels.com listing ${productId}`,
      priceline: `Priceline listing ${productId}`,
      uber: `Uber item ${productId}`,
      doordash: `DoorDash item ${productId}`,
      grubhub: `Grubhub item ${productId}`,
      other: "Untitled deal",
    };
    return labels[merchant];
  }
  return "Untitled deal";
}

export function canonicalSourceUrl(merchant: Merchant, productId: string | null, cleanedUrl: string): string {
  if (merchant === "amazon" && productId) return `https://www.amazon.com/dp/${productId}`;
  if (merchant === "walmart" && productId) return `https://www.walmart.com/ip/${productId}`;
  if (merchant === "target" && productId) return `https://www.target.com/p/-/A-${productId}`;
  if (merchant === "home-depot" && productId) {
    try {
      const parsed = new URL(cleanedUrl);
      if (parsed.pathname.includes(productId)) return cleanedUrl;
    } catch {
      // ignore
    }
    return `https://www.homedepot.com/p/${productId}`;
  }
  if (merchant === "best-buy" && productId) {
    return `https://www.bestbuy.com/site/${productId}.p?skuId=${productId}`;
  }
  if (merchant === "costco") {
    try {
      const parsed = new URL(cleanedUrl);
      parsed.search = "";
      parsed.hash = "";
      if (productId && parsed.pathname.includes(productId)) return parsed.toString();
      if (productId) return `https://www.costco.com/p/-/${productId}`;
      return parsed.toString();
    } catch {
      return cleanedUrl;
    }
  }
  if (merchant === "newegg" && productId) return `https://www.newegg.com/p/${productId}`;
  if (merchant === "ebay" && productId) return `https://www.ebay.com/itm/${productId}`;
  if (merchant === "kohls" && productId) {
    try {
      const parsed = new URL(cleanedUrl);
      parsed.search = "";
      parsed.hash = "";
      if (parsed.pathname.includes(`prd-${productId}`)) return parsed.toString();
    } catch {
      // ignore
    }
    return `https://www.kohls.com/product/prd-${productId}/`;
  }
  if (merchant === "dicks" && productId) {
    try {
      const parsed = new URL(cleanedUrl);
      parsed.search = "";
      parsed.hash = "";
      if (parsed.pathname.includes(productId)) return parsed.toString();
    } catch {
      // ignore
    }
    return `https://www.dickssportinggoods.com/p/${productId}`;
  }
  if (merchant === "office-depot" ||
      merchant === "booking" ||
      merchant === "expedia" ||
      merchant === "hotels" && productId) {
    return `https://www.officedepot.com/a/products/${productId}/`;
  }
  return cleanedUrl;
}

export async function parseDealUrl(rawUrl: string): Promise<ParsedDeal> {
  let started = normalizeUrl(rawUrl);
  if (isRetailerShortUrl(started)) {
    started = await unwrapRetailerUrl(started);
  }
  const startedMerchant = detectMerchant(started);
  const startedProductId = extractMerchantProductId(started, startedMerchant);
  const fetched = await fetchHtml(started);
  const wall = Boolean(fetched && isBlockedDestination(fetched.finalUrl, fetched.html));
  const scrapeBlocked = !fetched || wall;
  const workingUrl = scrapeBlocked ? started : fetched.finalUrl;
  const merchant =
    detectMerchant(workingUrl) === "other" ? startedMerchant : detectMerchant(workingUrl);
  const merchantProductId =
    extractMerchantProductId(workingUrl, merchant) ?? startedProductId;
  let extracted =
    fetched && !wall
      ? extractFromHtml(fetched.html, merchant)
      : { title: null, currentPrice: null, listPrice: null, scrapedImageUrl: null };

  if (looksLikeChallengeCopy(extracted.title)) {
    extracted = { title: null, currentPrice: null, listPrice: null, scrapedImageUrl: null };
  }

  if (!extracted.title || !extracted.scrapedImageUrl) {
    const extra = await fetchMicrolink(cleanTrackingParams(started));
    if (extra?.title && !extracted.title && !looksLikeChallengeCopy(extra.title)) {
      extracted = { ...extracted, title: extra.title };
    }
    if (extra?.image && !extracted.scrapedImageUrl) {
      const microlinkPhoto = preferProductPhoto(extra.image);
      if (microlinkPhoto) extracted = { ...extracted, scrapedImageUrl: microlinkPhoto };
    }
  }

  const sourceUrl = canonicalSourceUrl(merchant, merchantProductId, cleanTrackingParams(workingUrl));
  const affiliateUrl = attachAffiliate(sourceUrl, merchant);
  const image = resolveDealImage({
    scrapedImageUrl: extracted.scrapedImageUrl,
    merchant,
    merchantProductId,
  });
  const title =
    (extracted.title && !looksLikeChallengeCopy(extracted.title) ? extracted.title : null) ||
    titleFromProductUrl(started, merchant, merchantProductId) ||
    fallbackTitle(merchant, merchantProductId, sourceUrl);
  const currentPrice = scrapeBlocked ? null : extracted.currentPrice;
  const face = giftCardFaceValue(started, workingUrl, sourceUrl, title);
  let listPrice = scrapeBlocked ? null : extracted.listPrice;
  if (face != null && (listPrice == null || listPrice < face) && (currentPrice == null || face > currentPrice)) {
    listPrice = face;
  }
  const bullets = buildDanBullets({
    merchant,
    currentPrice,
    listPrice,
    percentOff: discountPercent(currentPrice, listPrice),
    promoCode: null,
    sourceUrl,
  });
  const stackingSteps = buildStackingSteps({ merchant, promoCode: null, currentPrice, sourceUrl });
  const socialPost = "";

  return {
    merchant,
    merchantProductId,
    sourceUrl,
    affiliateUrl,
    title,
    currentPrice,
    listPrice,
    scrapedImageUrl: extracted.scrapedImageUrl ?? (image.imageTier === "cdn" ? image.imageUrl : null),
    imageUrl: image.imageUrl,
    imageTier: image.imageTier,
    bullets,
    stackingSteps,
    socialPost,
    pricesBlocked: currentPrice == null,
    scrapeNote: [
      scrapeBlocked
        ? `${merchantLabel(merchant, sourceUrl)} blocked the listing page. Merchant, cleaned URL, and a title from the link are filled.`
        : null,
      currentPrice == null
        ? "Paste the live price from the tab — do not invent one."
        : null,
      image.imageTier === "placeholder" && !cdnImageFor(merchant, merchantProductId)
        ? "Paste the product Image URL from the listing. Do not generate a lifestyle shot."
        : null,
    ]
      .filter(Boolean)
      .join(" ") || null,
  };
}
