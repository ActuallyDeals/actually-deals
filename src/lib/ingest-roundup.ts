import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { attachAffiliate, cleanTrackingParams, withHttps } from "@/lib/affiliate";
import { buildDanBullets, buildStackingSteps, discountPercent } from "@/lib/copy-engine";
import { parseMoney } from "@/lib/format";
import { resolveDealImage } from "@/lib/images";
import { detectMerchant, extractMerchantProductId } from "@/lib/merchants";
import { isDirectRetailerListing, isRetailerShortUrl } from "@/lib/outbound";
import {
  canonicalSourceUrl,
  fetchHtml,
  parseDealUrl,
  ParseDealError,
} from "@/lib/parse-deal";
import type { Merchant, ParsedDeal } from "@/lib/types";

const UNWRAP_TIMEOUT_MS = 5000;
const ROUNDUP_CAP = 12;
const SKIP_CLOSEST = "nav, footer, header, aside, .author-gear, .author-gear-items, .author-box, .related, .recommended, #comments, .comments";

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

function nestedRetailerUrls(href: string): string[] {
  const found: string[] = [];
  try {
    const url = new URL(href);
    found.push(url.toString());
    for (const key of ["u", "url", "destination", "dest", "murl"]) {
      const nested = url.searchParams.get(key);
      if (nested) {
        try {
          found.push(new URL(nested).toString());
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }
  return found;
}

function isRetailerish(href: string): boolean {
  const merchant = detectMerchant(href);
  if (merchant !== "other") return true;
  return isRetailerShortUrl(href);
}

function pickRetailerHref(raw: string, pageUrl: string): string | null {
  let absolute = raw.trim();
  if (!absolute) return null;
  try {
    absolute = new URL(absolute, pageUrl).toString();
  } catch {
    return null;
  }
  for (const candidate of nestedRetailerUrls(absolute)) {
    if (!isRetailerish(candidate)) continue;
    const merchant = detectMerchant(candidate);
    if (isRetailerShortUrl(candidate)) return candidate;
    if (merchant !== "other" && extractMerchantProductId(candidate, merchant)) return candidate;
  }
  return null;
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
    .replace(/[–—-]\s*(new )?all-time low.*$/gi, " ")
    .replace(/\b(deal score|frontpage deal|slickdeals)\b.*$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 140);
}

function contentRoot($: cheerio.CheerioAPI) {
  const article = $("article, .entry-content, .post-content, .post-body, main").first();
  return article.length ? article : $("body");
}

function skipped($: cheerio.CheerioAPI, el: AnyNode): boolean {
  return $(el).closest(SKIP_CLOSEST).length > 0;
}

function candidateFromAnchor(
  $: cheerio.CheerioAPI,
  anchor: AnyNode,
  pageUrl: string,
): RoundupCandidate | null {
  const href = pickRetailerHref($(anchor).attr("href") ?? "", pageUrl);
  if (!href) return null;
  const item = $(anchor).closest("li, p, div");
  const blob = (item.text() || $(anchor).text() || "").replace(/\s+/g, " ").trim();
  const priced = pricesFromText(blob);
  const title = titleFromItemText(blob) || titleFromItemText($(anchor).text()) || "Untitled deal";
  return {
    href,
    title,
    currentPrice: priced.current,
    listPrice: priced.list,
  };
}

/** Sync extract of retailer product links + on-page prices. Does not invent prices. */
export function extractRetailerCandidates(html: string, pageUrl: string): RoundupCandidate[] {
  const $ = cheerio.load(html);
  const root = contentRoot($);
  const listHits: RoundupCandidate[] = [];
  const seen = new Set<string>();

  root.find("li").each((_, li) => {
    if (skipped($, li)) return;
    const anchor = $(li).find("a[href]").toArray().find((el) => pickRetailerHref($(el).attr("href") ?? "", pageUrl));
    if (!anchor) return;
    const candidate = candidateFromAnchor($, anchor, pageUrl);
    if (!candidate) return;
    const key = candidate.href.split("?")[0];
    if (seen.has(key)) return;
    seen.add(key);
    listHits.push(candidate);
  });

  if (listHits.length >= 2) return listHits.slice(0, ROUNDUP_CAP);

  const all: RoundupCandidate[] = [];
  const seenAll = new Set<string>();
  root.find("a[href]").each((_, el) => {
    if (skipped($, el)) return;
    const candidate = candidateFromAnchor($, el, pageUrl);
    if (!candidate) return;
    const key = candidate.href.split("?")[0];
    if (seenAll.has(key)) return;
    seenAll.add(key);
    all.push(candidate);
  });
  return all.slice(0, ROUNDUP_CAP);
}

async function unwrapRedirects(rawUrl: string): Promise<string> {
  let current = rawUrl;
  for (let step = 0; step < 6; step += 1) {
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
  const merchant: Merchant = detectMerchant(unwrapped) === "other" ? detectMerchant(candidate.href) : detectMerchant(unwrapped);
  const productId = extractMerchantProductId(unwrapped, merchant) ?? extractMerchantProductId(candidate.href, merchant);
  const cleaned = cleanTrackingParams(unwrapped);
  const sourceUrl = canonicalSourceUrl(merchant, productId, cleaned);
  const affiliateUrl = attachAffiliate(sourceUrl, merchant);
  const image = resolveDealImage({
    scrapedImageUrl: null,
    merchant,
    merchantProductId: productId,
  });
  const currentPrice = candidate.currentPrice;
  const listPrice =
    candidate.listPrice != null && currentPrice != null && candidate.listPrice > currentPrice
      ? candidate.listPrice
      : null;
  const bullets = buildDanBullets({
    merchant,
    currentPrice,
    listPrice,
    percentOff: discountPercent(currentPrice, listPrice),
    promoCode: null,
  });
  const notes = [
    unwrapFailed
      ? "Short link did not unwrap. Confirm the retailer URL before Ready."
      : null,
    currentPrice == null ? "Paste the live price from the listing. Do not invent one." : null,
    image.imageTier === "placeholder"
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
        "No retailer product links found on that page. Paste an Amazon, Walmart, Target, Home Depot, or Best Buy product URL.",
    };
  }

  const deals: ParsedDeal[] = [];
  for (const candidate of candidates) {
    const needsUnwrap = isRetailerShortUrl(candidate.href) || !extractMerchantProductId(candidate.href, detectMerchant(candidate.href));
    let unwrapped = candidate.href;
    let unwrapFailed = false;
    if (needsUnwrap) {
      unwrapped = await unwrapRedirects(candidate.href);
      const merchant = detectMerchant(unwrapped);
      if (merchant === "other" || !extractMerchantProductId(unwrapped, merchant)) {
        unwrapFailed = isRetailerShortUrl(candidate.href);
      }
    }
    deals.push(parsedFromCandidate(candidate, unwrapped, unwrapFailed));
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
