import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { attachAffiliate, cleanTrackingParams, withHttps } from "@/lib/affiliate";
import { buildDanBullets, buildStackingSteps, discountPercent } from "@/lib/copy-engine";
import { parseMoney } from "@/lib/format";
import { cdnImageFor, resolveDealImage } from "@/lib/images";
import { detectMerchant, extractMerchantProductId } from "@/lib/merchants";
import { isDirectRetailerListing, isRetailerShortUrl } from "@/lib/outbound";
import {
  canonicalSourceUrl,
  fetchHtml,
  parseDealUrl,
  ParseDealError,
} from "@/lib/parse-deal";
import { giftCardFaceValue } from "@/lib/pricing";
import type { Merchant, ParsedDeal } from "@/lib/types";

const UNWRAP_TIMEOUT_MS = 5000;
const ROUNDUP_CAP = 12;
/** Classes/ids proven on 9to5Toys recirc: sidebar cards, related guides, newsletter, author gear, in-post media-text promos. */
const SKIP_CLOSEST =
  "nav, footer, header, aside, .sidebar, .author-gear, .author-gear-items, .author-box, .author-bio, .author-bio-container, .related, .related-guides, .related-guide, .recommended, .visitor-promo, .featured-items, .ninetofive-newsletter-subscribe, .wp-block-media-text, #comments, .comments";

const NESTED_KEYS = ["u", "url", "destination", "dest", "murl", "target", "redirect", "rurl", "link"];
const WRAPPER_PATH = /(?:^|\/)(?:goto|out|recomm|aff)(?:\/|$)/i;
const WRAPPER_HOSTS = ["geni.us", "geniuslink.com"];

export interface RoundupCandidate {
  href: string;
  title: string;
  currentPrice: number | null;
  listPrice: number | null;
}

export interface IngestResult {
  deals: ParsedDeal[];
  scrapeNote: string | null;
}

function absoluteUrl(raw: string, pageUrl?: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return pageUrl ? new URL(trimmed, pageUrl).toString() : new URL(trimmed).toString();
  } catch {
    return null;
  }
}

function decodeMaybeUrl(value: string): string | null {
  const tries = [value];
  try {
    const decoded = decodeURIComponent(value);
    if (decoded !== value) tries.push(decoded);
  } catch {
    // ignore
  }
  for (const candidate of tries) {
    const trimmed = candidate.trim();
    if (!/^https?:\/\//i.test(trimmed)) continue;
    try {
      return new URL(trimmed).toString();
    } catch {
      // ignore
    }
  }
  return null;
}

function nestedRetailerUrls(href: string): string[] {
  const found: string[] = [];
  try {
    const url = new URL(href);
    found.push(url.toString());
    for (const key of NESTED_KEYS) {
      const nested = url.searchParams.get(key);
      if (!nested) continue;
      const decoded = decodeMaybeUrl(nested);
      if (decoded) found.push(decoded);
    }
    const pathEmbedded = url.pathname.match(/\/(?:goto|out|recomm|aff)\/(.+)/i);
    if (pathEmbedded?.[1]) {
      let rest = pathEmbedded[1];
      try {
        rest = decodeURIComponent(rest);
      } catch {
        // ignore
      }
      const decoded = decodeMaybeUrl(rest.startsWith("http") ? rest : `https://${rest}`);
      if (decoded) found.push(decoded);
    }
  } catch {
    // ignore
  }
  return found;
}

function isClickWrapper(href: string): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (WRAPPER_HOSTS.some((part) => host === part || host.endsWith(`.${part}`))) return true;
    return WRAPPER_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

function isRetailerish(href: string): boolean {
  const merchant = detectMerchant(href);
  if (merchant !== "other") return true;
  return isRetailerShortUrl(href);
}

function retailerProductHref(href: string): string | null {
  if (!isRetailerish(href)) return null;
  const merchant = detectMerchant(href);
  if (isRetailerShortUrl(href)) return href;
  if (merchant !== "other" && extractMerchantProductId(href, merchant)) return href;
  return null;
}

/** Resolve a pasted/roundup href to a retailer short link, product URL, or click wrapper to follow. */
export function pickRetailerHref(raw: string, pageUrl: string): string | null {
  const absolute = absoluteUrl(raw, pageUrl);
  if (!absolute) return null;
  for (const candidate of nestedRetailerUrls(absolute)) {
    const hit = retailerProductHref(candidate);
    if (hit) return hit;
  }
  if (isClickWrapper(absolute)) return absolute;
  return null;
}

function listingKey(href: string, merchant?: Merchant, productId?: string | null): string {
  const resolvedMerchant = merchant ?? detectMerchant(href);
  const resolvedId =
    productId !== undefined
      ? productId
      : resolvedMerchant !== "other"
        ? extractMerchantProductId(href, resolvedMerchant)
        : null;
  if (resolvedMerchant !== "other" && resolvedId) return `${resolvedMerchant}:${resolvedId}`;
  try {
    const url = new URL(href);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname}`.toLowerCase();
  } catch {
    return href.split("?")[0].toLowerCase();
  }
}

function pricesFromText(text: string): { current: number | null; list: number | null } {
  const listMatch =
    text.match(/\(\s*reg\.?\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i) ||
    text.match(/\bwas\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i) ||
    text.match(/\blist\s*\$?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i);
  const dollars = [...text.matchAll(/\$([0-9][0-9,]*(?:\.[0-9]{1,2})?)/g)]
    .map((match) => parseMoney(match[0]))
    .filter((value): value is number => value != null && value > 0);
  const list = listMatch ? parseMoney(listMatch[1]) : null;
  const current = dollars.find((value) => list == null || value < list) ?? dollars[0] ?? null;
  if (current != null && list != null && list > current) return { current, list };
  return { current, list: null };
}

function titleFromItemText(text: string): string {
  const cleaned = text
    .replace(/\$[0-9][0-9,]*(?:\.[0-9]{1,2})?/g, " ")
    .replace(/\(reg\.?[^)]*\)/gi, " ")
    .replace(/\bwas\b[^.]{0,24}/gi, " ")
    .replace(/[–—-]\s*(new )?all-time lows?.*$/gi, " ")
    .replace(/\b(new )?all-time lows?\b/gi, " ")
    .replace(/\b9to5(?:toys|mac|google)?\b/gi, " ")
    .replace(/\b(deal score|frontpage deal|slickdeals)\b.*$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 140);
}

function contentRoot($: cheerio.CheerioAPI) {
  for (const sel of [".post-content", ".entry-content", ".post-body", "article", "main"]) {
    const node = $(sel).first();
    if (node.length) return node;
  }
  return $("body");
}

function skipped($: cheerio.CheerioAPI, el: AnyNode): boolean {
  return $(el).closest(SKIP_CLOSEST).length > 0;
}

function itemBlob($: cheerio.CheerioAPI, anchor: AnyNode): string {
  const li = $(anchor).closest("li");
  if (li.length) return li.text().replace(/\s+/g, " ").trim();
  const p = $(anchor).closest("p");
  if (p.length) return p.text().replace(/\s+/g, " ").trim();
  return ($(anchor).text() || "").replace(/\s+/g, " ").trim();
}

function candidateFromAnchor(
  $: cheerio.CheerioAPI,
  anchor: AnyNode,
  pageUrl: string,
): RoundupCandidate | null {
  const href = pickRetailerHref($(anchor).attr("href") ?? "", pageUrl);
  if (!href) return null;
  const blob = itemBlob($, anchor);
  const priced = pricesFromText(blob);
  const title = titleFromItemText(blob) || titleFromItemText($(anchor).text()) || "Untitled deal";
  return {
    href,
    title,
    currentPrice: priced.current,
    listPrice: priced.list,
  };
}

function pushUnique(list: RoundupCandidate[], seen: Set<string>, candidate: RoundupCandidate) {
  const key = listingKey(candidate.href);
  if (seen.has(key)) return;
  seen.add(key);
  list.push(candidate);
}

/** Sync extract of retailer product links + on-page prices. Does not invent prices. */
export function extractRetailerCandidates(html: string, pageUrl: string): RoundupCandidate[] {
  const $ = cheerio.load(html);
  const root = contentRoot($);
  const listHits: RoundupCandidate[] = [];
  const seen = new Set<string>();

  root.find("li").each((_, li) => {
    if (skipped($, li)) return;
    const anchor = $(li)
      .find("a[href]")
      .toArray()
      .find((el) => pickRetailerHref($(el).attr("href") ?? "", pageUrl));
    if (!anchor) return;
    const candidate = candidateFromAnchor($, anchor, pageUrl);
    if (!candidate) return;
    pushUnique(listHits, seen, candidate);
  });

  if (listHits.length >= 2) return listHits.slice(0, ROUNDUP_CAP);

  const all: RoundupCandidate[] = [];
  const seenAll = new Set<string>();
  root.find("a[href]").each((_, el) => {
    if (skipped($, el)) return;
    const candidate = candidateFromAnchor($, el, pageUrl);
    if (!candidate) return;
    pushUnique(all, seenAll, candidate);
  });
  return all.slice(0, ROUNDUP_CAP);
}

function firstProductUrl(href: string): string | null {
  for (const candidate of nestedRetailerUrls(href)) {
    const merchant = detectMerchant(candidate);
    if (merchant !== "other" && extractMerchantProductId(candidate, merchant)) return candidate;
  }
  return null;
}

async function unwrapRedirects(rawUrl: string): Promise<string> {
  let current = rawUrl;
  for (let step = 0; step < 6; step += 1) {
    const nestedProduct = firstProductUrl(current);
    if (nestedProduct) return nestedProduct;
    const merchant = detectMerchant(current);
    if (merchant !== "other" && extractMerchantProductId(current, merchant)) return current;
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(UNWRAP_TIMEOUT_MS),
      });
      const location = response.headers.get("location");
      if (!location) {
        return response.url && response.url !== current ? response.url : current;
      }
      current = new URL(location, current).toString();
    } catch {
      return current;
    }
  }
  return current;
}

function parsedFromCandidate(
  candidate: RoundupCandidate,
  unwrapped: string,
  unwrapFailed: boolean,
): ParsedDeal {
  const merchant: Merchant =
    detectMerchant(unwrapped) === "other" ? detectMerchant(candidate.href) : detectMerchant(unwrapped);
  const productId =
    extractMerchantProductId(unwrapped, merchant) ?? extractMerchantProductId(candidate.href, merchant);
  const cleaned = cleanTrackingParams(unwrapped);
  const sourceUrl = canonicalSourceUrl(merchant, productId, cleaned);
  const affiliateUrl = attachAffiliate(sourceUrl, merchant);
  const image = resolveDealImage({
    scrapedImageUrl: null,
    merchant,
    merchantProductId: productId,
  });
  const currentPrice = candidate.currentPrice;
  const face = giftCardFaceValue(candidate.href, unwrapped, candidate.title);
  let listPrice =
    candidate.listPrice != null && currentPrice != null && candidate.listPrice > currentPrice
      ? candidate.listPrice
      : null;
  if (face != null && (listPrice == null || listPrice < face) && (currentPrice == null || face > currentPrice)) {
    listPrice = face;
  }
  const bullets = buildDanBullets({
    merchant,
    currentPrice,
    listPrice,
    percentOff: discountPercent(currentPrice, listPrice),
    promoCode: null,
  });
  const notes = [
    unwrapFailed ? "Short link did not unwrap. Confirm the retailer URL before Ready." : null,
    currentPrice == null ? "Paste the live price from the listing. Do not invent one." : null,
    image.imageTier === "placeholder" && !cdnImageFor(merchant, productId)
      ? "Paste the product Image URL from the listing. Do not generate a lifestyle shot."
      : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    merchant,
    merchantProductId: productId,
    sourceUrl,
    affiliateUrl,
    title: candidate.title || "Untitled deal",
    currentPrice,
    listPrice,
    scrapedImageUrl: image.imageTier === "cdn" ? image.imageUrl : null,
    imageUrl: image.imageUrl,
    imageTier: image.imageTier,
    bullets,
    stackingSteps: buildStackingSteps({ merchant, promoCode: null, currentPrice }),
    socialPost: "",
    pricesBlocked: currentPrice == null,
    scrapeNote: notes || null,
  };
}

/** Turn extracted roundup rows into Incoming cards without fetching. Does not clone source writeup. */
export function dealsFromRoundupCandidates(
  candidates: RoundupCandidate[],
  unwrappedByHref?: Map<string, string>,
): ParsedDeal[] {
  const deals: ParsedDeal[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const unwrapped = unwrappedByHref?.get(candidate.href) ?? candidate.href;
    const deal = parsedFromCandidate(candidate, unwrapped, false);
    const key = listingKey(deal.sourceUrl, deal.merchant, deal.merchantProductId);
    if (seen.has(key)) continue;
    seen.add(key);
    deals.push(deal);
  }
  return deals;
}

function hrefNeedsUnwrap(href: string): boolean {
  if (isClickWrapper(href) || isRetailerShortUrl(href)) return true;
  const merchant = detectMerchant(href);
  return merchant === "other" || !extractMerchantProductId(href, merchant);
}

async function ingestThirdPartyPage(rawUrl: string): Promise<IngestResult> {
  const started = withHttps(rawUrl.trim());
  const fetched = await fetchHtml(started);
  if (!fetched) {
    return {
      deals: [],
      scrapeNote:
        "Could not read that deal page. Paste a retailer product URL, or add links by hand. Do not invent prices.",
    };
  }
  const candidates = extractRetailerCandidates(fetched.html, fetched.finalUrl || started);
  if (candidates.length === 0) {
    return {
      deals: [],
      scrapeNote:
        "No retailer product links found on that page. Paste an Amazon, Walmart, Target, Home Depot, Best Buy, Costco, Newegg, eBay, Kohl's, Dick's, or Office Depot product URL.",
    };
  }

  const deals: ParsedDeal[] = [];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    let unwrapped = candidate.href;
    let unwrapFailed = false;
    if (hrefNeedsUnwrap(candidate.href)) {
      unwrapped = await unwrapRedirects(candidate.href);
      const merchant = detectMerchant(unwrapped);
      if (merchant === "other" || !extractMerchantProductId(unwrapped, merchant)) {
        unwrapFailed = isRetailerShortUrl(candidate.href) || isClickWrapper(candidate.href);
      }
    }
    const deal = parsedFromCandidate(candidate, unwrapped, unwrapFailed);
    const key = listingKey(deal.sourceUrl, deal.merchant, deal.merchantProductId);
    if (seen.has(key)) continue;
    seen.add(key);
    deals.push(deal);
  }

  const missing = deals.filter((deal) => deal.currentPrice == null).length;
  const scrapeNote =
    deals.length > 1
      ? `Found ${deals.length} products. Parked as Incoming — write original notes, never clone the source writeup.${
          missing ? ` ${missing} still need a live price from the listing.` : ""
        }`
      : deals[0]?.scrapeNote ?? null;
  return { deals, scrapeNote };
}

function looksLikeDirectListing(rawUrl: string): boolean {
  try {
    const url = withHttps(rawUrl.trim());
    const merchant = detectMerchant(url);
    return isDirectRetailerListing(url, merchant);
  } catch {
    return false;
  }
}

/** Paste handler for /admin: retailer listing or third-party deal page. */
export async function ingestDealPaste(rawUrl: string): Promise<IngestResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new ParseDealError("Paste a product URL to parse.");
  if (looksLikeDirectListing(trimmed)) {
    const parsed = await parseDealUrl(trimmed);
    return { deals: [parsed], scrapeNote: parsed.scrapeNote };
  }
  return ingestThirdPartyPage(trimmed);
}
