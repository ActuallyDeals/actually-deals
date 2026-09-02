import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { attachAffiliate, cleanTrackingParams, withHttps } from "@/lib/affiliate";
import {
  buildDanBullets,
  buildMechanicsBullets,
  buildMechanicsSteps,
  buildMechanicsWhy,
  buildStackingSteps,
  discountPercent,
  extractDealMechanics,
  hasExtraMechanics,
} from "@/lib/copy-engine";
import { looksClonedWriteup } from "@/lib/stack-copy";
import { parseMoney } from "@/lib/format";
import { cdnImageFor, resolveDealImage } from "@/lib/images";
import { detectMerchant, extractMerchantProductId } from "@/lib/merchants";
import { isDirectRetailerListing, isRetailerShortUrl } from "@/lib/outbound";
import {
  canonicalSourceUrl,
  extractFromHtml,
  fetchHtml,
  looksLikeChallengeCopy,
  parseDealUrl,
  ParseDealError,
} from "@/lib/parse-deal";
import { giftCardFaceValue } from "@/lib/pricing";
import type { Merchant, ParsedDeal } from "@/lib/types";

const UNWRAP_TIMEOUT_MS = 5000;
const ROUNDUP_CAP = 12;
/** Classes/ids proven on 9to5Toys recirc: sidebar cards, related guides, newsletter, author gear, in-post media-text promos. */
const SKIP_CLOSEST =
  "nav, footer, header, aside, .sidebar, .author-gear, .author-gear-items, .author-box, .author-bio, .author-bio-container, .related, .related-guides, .related-guide, .related-posts, .related-post, .jp-relatedposts, .recommended, .visitor-promo, .featured-items, .ninetofive-newsletter-subscribe, .newsletter, .newsletter-signup, .wp-block-media-text, #comments, .comments, .comments-area, #respond, #commentsBox, .commentsBox, .commentsSectionV2, .leaveACommentV2, .dealDetailsPage__card--commentsSection, .dealDetailsSidebar, .sidebarDeals, .communityWiki, #communityNotesTab, .aboutThePosterTab, .recommendedDealAlerts, .youMightLike, .comment, .reply";

const NESTED_KEYS = [
  "u",
  "url",
  "destination",
  "dest",
  "murl",
  "target",
  "redirect",
  "rurl",
  "link",
  "trd",
  "u2",
  "u3",
  "sdurl",
  "desturl",
  "targeturl",
];
const WRAPPER_PATH = /(?:^|\/)(?:goto|out|recomm|aff|click|visit|attachdeal)(?:\/|$|\.php)/i;
const WRAPPER_HOSTS = ["geni.us", "geniuslink.com", "sldc.net", "sdclick.com", "sdclick.net", "linksynergy.com"];
const SLICKDEALS_THREAD_PATH = /\/(?:f\/\d+|forums\/showthread\.php)/i;

export interface RoundupCandidate {
  href: string;
  title: string;
  currentPrice: number | null;
  listPrice: number | null;
  sourceText?: string;
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
    const pathEmbedded = url.pathname.match(/\/(?:goto|out|recomm|aff|click|visit|attachdeal)\/(.+)/i);
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

export function isClickWrapper(href: string): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (WRAPPER_HOSTS.some((part) => host === part || host.endsWith(`.${part}`))) return true;
    return WRAPPER_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

function hostnameOf(href: string): string | null {
  try {
    return new URL(href).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

const HTTP_URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const NON_DEAL_HOSTS = [
  "twitter.com",
  "x.com",
  "t.co",
  "facebook.com",
  "fb.com",
  "instagram.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
];
const HUB_FIRST_SEGMENTS = new Set([
  "food-deals-freebies",
  "amazon-deals",
  "target-deals",
  "walmart-deals",
  "costco-deals",
  "deals",
  "freebies",
  "coupons",
  "coupon",
  "category",
  "tag",
  "author",
  "page",
  "store",
  "stores",
  "shop",
  "about",
  "contact",
]);
const HUB_REFUSE_NOTE =
  "That looks like a deal hub / index, not a single deal. Paste a single deal article or a retailer product URL.";

function stripTrailingUrlJunk(raw: string): string {
  return raw.replace(/[.,;:!?]+$/g, "").replace(/[)\]]+$/g, "");
}

/** http(s) URLs inside a Slack/tweet/sentence paste. Does not invent links. */
export function extractHttpUrls(text: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const re = new RegExp(HTTP_URL_RE.source, HTTP_URL_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const candidate = stripTrailingUrlJunk(match[0]);
    try {
      const href = new URL(candidate).toString();
      if (seen.has(href)) continue;
      seen.add(href);
      found.push(href);
    } catch {
      // ignore
    }
  }
  return found;
}

function isNonDealHost(href: string): boolean {
  const host = hostnameOf(href);
  if (!host) return false;
  return NON_DEAL_HOSTS.some((part) => host === part || host.endsWith(`.${part}`));
}

function isHip2SaveHost(href: string): boolean {
  const host = hostnameOf(href);
  return host === "hip2save.com" || Boolean(host?.endsWith(".hip2save.com"));
}

function isFreebieGuyHost(href: string): boolean {
  const host = hostnameOf(href);
  return host === "thefreebieguy.com" || Boolean(host?.endsWith(".thefreebieguy.com"));
}

/** Category/index dumps (Freebie Guy hubs, Hip2Save restaurant index). Not a single deal article. */
export function isDealHubUrl(href: string): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const hip = host === "hip2save.com" || host.endsWith(".hip2save.com");
    const freebie = host === "thefreebieguy.com" || host.endsWith(".thefreebieguy.com");
    if (!hip && !freebie) return false;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return true;
    const first = parts[0].toLowerCase();
    if (HUB_FIRST_SEGMENTS.has(first)) return true;
    if (hip && parts.length === 1 && (first === "tips" || first === "deals" || first === "coupons")) return true;
    if (hip && /restaurant-deals/i.test(url.pathname)) return true;
    if (freebie && parts.length === 1 && /(?:deals|freebies|coupons)$/i.test(first)) return true;
    return false;
  } catch {
    return false;
  }
}

export function isDealBlogArticleUrl(href: string): boolean {
  if (isDealHubUrl(href)) return false;
  return isHip2SaveHost(href) || isFreebieGuyHost(href);
}

function isRetailerProductUrl(href: string): boolean {
  const merchant = detectMerchant(href);
  if (isDirectRetailerListing(href, merchant)) return true;
  return Boolean(retailerProductHref(href));
}

function looksLikeStandaloneUrl(raw: string): boolean {
  if (!raw || /\s/.test(raw)) return false;
  try {
    const url = new URL(withHttps(raw));
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/**
 * Pick the deal URL from a paste box. Prefers a retailer product URL over a blog URL.
 * Returns a hub URL as-is so ingest can refuse it with a scrapeNote.
 */
export function resolvePasteTarget(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (looksLikeStandaloneUrl(trimmed)) return withHttps(trimmed);

  const urls = extractHttpUrls(trimmed);
  if (urls.length === 0) return null;
  const usable = urls.filter((href) => !isNonDealHost(href));
  const pool = usable.length ? usable : urls;

  const retailer = pool.find((href) => isRetailerProductUrl(href));
  if (retailer) return retailer;

  const article = pool.find((href) => !isDealHubUrl(href) && !isNonDealHost(href));
  if (article) return article;

  return pool[0] ?? null;
}

/** slickdeals.net thread pages only — not daily/money blogs, not click hosts. */
export function isSlickdealsThreadUrl(href: string): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "slickdeals.net") return false;
    return SLICKDEALS_THREAD_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

const FORUM_CLICK_HOSTS = ["sldc.net", "sdclick.com", "sdclick.net"];

/** Forum pages and SD click hosts — never a retailer listing. */
export function isDealForumUrl(href: string): boolean {
  const host = hostnameOf(href);
  if (!host) return false;
  if (host === "slickdeals.net" || host.endsWith(".slickdeals.net")) return true;
  return FORUM_CLICK_HOSTS.some((part) => host === part || host.endsWith(`.${part}`));
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
  const nested = nestedRetailerUrls(absolute);
  for (const candidate of nested) {
    const hit = retailerProductHref(candidate);
    if (hit) return hit;
  }
  for (const candidate of nested) {
    if (candidate === absolute) continue;
    if (isDealForumUrl(candidate) || isClickWrapper(candidate)) continue;
    try {
      const path = new URL(candidate).pathname.split("/").filter(Boolean);
      if (path.length >= 2) return candidate;
    } catch {
      // ignore
    }
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
    .replace(/\bhip2save\b/gi, " ")
    .replace(/\b(?:the\s+)?freebie guy\b/gi, " ")
    .replace(/\s*[|\-–]\s*(Hip2Save|The Freebie Guy|Slickdeals|9to5(?:Toys|Mac|Google)?)\s*$/i, " ")
    .replace(/\b(deal score|frontpage deal|slickdeals)\b.*$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 140);
}

function cleanThreadTitle(raw: string): string {
  return titleFromItemText(
    raw
      .replace(/\s*[-|–—]\s*\d{4}-\d{2}-\d{2}\s*$/g, " ")
      .replace(/\bfrontpage deal\b/gi, " ")
      .replace(/\bdeal score\b\s*\d*/gi, " "),
  );
}

const SLICKDEALS_OP_SELECTORS = [
  ".dealDetailsTab__bodyHtml",
  ".dealDetailsRawHtml",
  ".dealDetailsTab__originalPost",
  "#posts .postbit:first-child .postcontent",
  "#posts .postcontainer:first-child .postcontent",
  "#posts .post:first-child .post_message",
];

function slickdealsContentRoots($: cheerio.CheerioAPI) {
  const roots: ReturnType<cheerio.CheerioAPI>[] = [];
  const seen = new Set<unknown>();
  for (const sel of [...SLICKDEALS_OP_SELECTORS, ".dealDetailsMainBlock"]) {
    const node = $(sel).first();
    if (!node.length) continue;
    const el = node.get(0);
    if (!el || seen.has(el)) continue;
    seen.add(el);
    roots.push(node);
  }
  return roots;
}

function contentRoot($: cheerio.CheerioAPI, pageUrl?: string) {
  if (pageUrl && isSlickdealsThreadUrl(pageUrl)) {
    const sd = slickdealsContentRoots($);
    if (sd[0]) return sd[0];
  }
  for (const sel of [".td-post-content", ".post-content", ".entry-content", ".post-body", "article", "main"]) {
    const node = $(sel).first();
    if (node.length) return node;
  }
  return $("body");
}

function priceFromSlickdealsSlug(pageUrl: string): number | null {
  try {
    const path = new URL(pageUrl).pathname;
    const match = path.match(/\/f\/\d+-.+-(\d{2,5})$/i);
    if (!match) return null;
    const value = Number.parseInt(match[1], 10);
    if (!Number.isFinite(value) || value < 1) return null;
    return value;
  } catch {
    return null;
  }
}

function opListPrice(text: string): number | null {
  const priced = pricesFromText(text);
  return priced.list;
}

function slickdealsThreadMeta($: cheerio.CheerioAPI, pageUrl: string): {
  title: string | null;
  currentPrice: number | null;
  listPrice: number | null;
  opText: string;
} {
  const opNode =
    SLICKDEALS_OP_SELECTORS.map((sel) => $(sel).first()).find((node) => node.length) ?? $();
  const opText = (opNode.length ? opNode.text() : "").replace(/\s+/g, " ").trim();
  const threadTitle =
    cleanThreadTitle($(".dealDetailsMainBlock__dealTitle").first().text()) ||
    cleanThreadTitle($('meta[property="og:title"]').attr("content") ?? "") ||
    cleanThreadTitle($("title").first().text()) ||
    cleanThreadTitle(decodeURIComponent(new URL(pageUrl).pathname.split("/").pop() ?? ""));
  const fromOp = pricesFromText(opText);
  const fromTitle = pricesFromText(
    $(".dealDetailsMainBlock__dealTitle").first().text() || $('meta[property="og:title"]').attr("content") || $("title").first().text() || "",
  );
  const current =
    fromOp.current ??
    parseMoney($(".dealDetailsMainBlock__finalPrice").first().text()) ??
    fromTitle.current ??
    priceFromSlickdealsSlug(pageUrl);
  // Was-price only when the original post clearly states reg/was/list — not SD chrome.
  const list = opListPrice(opText);
  return {
    title: threadTitle || null,
    currentPrice: current,
    listPrice: list != null && current != null && list > current ? list : null,
    opText,
  };
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
    sourceText: blob || undefined,
  };
}

function pushUnique(list: RoundupCandidate[], seen: Set<string>, candidate: RoundupCandidate) {
  const key = listingKey(candidate.href);
  if (seen.has(key)) return;
  seen.add(key);
  list.push(candidate);
}

function collectFromRoot(
  $: cheerio.CheerioAPI,
  root: ReturnType<cheerio.CheerioAPI>,
  pageUrl: string,
): RoundupCandidate[] {
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

function overlaySlickdealsThread(
  candidates: RoundupCandidate[],
  $: cheerio.CheerioAPI,
  pageUrl: string,
): RoundupCandidate[] {
  if (!isSlickdealsThreadUrl(pageUrl) || candidates.length === 0) return candidates;
  const thread = slickdealsThreadMeta($, pageUrl);
  return candidates.map((candidate) => ({
    ...candidate,
    title: thread.title || candidate.title,
    currentPrice: candidate.currentPrice ?? thread.currentPrice,
    listPrice:
      thread.listPrice != null &&
      (candidate.currentPrice ?? thread.currentPrice) != null &&
      thread.listPrice > (candidate.currentPrice ?? thread.currentPrice)!
        ? thread.listPrice
        : null,
    sourceText: thread.opText || candidate.sourceText,
  }));
}

function articleBodyText($: cheerio.CheerioAPI, root: ReturnType<cheerio.CheerioAPI>): string {
  const clone = root.clone();
  clone.find(SKIP_CLOSEST).remove();
  return clone.text().replace(/\s+/g, " ").trim();
}

function articleTitle($: cheerio.CheerioAPI): string {
  return (
    cleanThreadTitle($("h1.entry-title").first().text()) ||
    cleanThreadTitle($("h1").first().text()) ||
    cleanThreadTitle($('meta[property="og:title"]').attr("content") ?? "") ||
    cleanThreadTitle($("title").first().text())
  );
}

function overlayDealBlogArticle(
  candidates: RoundupCandidate[],
  $: cheerio.CheerioAPI,
  pageUrl: string,
): RoundupCandidate[] {
  if (!isDealBlogArticleUrl(pageUrl) || candidates.length === 0) return candidates;
  const bodyText = articleBodyText($, contentRoot($, pageUrl));
  const title = articleTitle($);
  const priced = pricesFromText(`${title} ${bodyText}`);
  const single = candidates.length === 1;
  return candidates.map((candidate) => {
    const current = candidate.currentPrice ?? (single ? priced.current : null);
    const list = candidate.listPrice ?? (single ? priced.list : null);
    return {
      ...candidate,
      title: single && title ? title : candidate.title,
      currentPrice: current,
      listPrice: list != null && current != null && list > current ? list : null,
      sourceText: single ? bodyText || candidate.sourceText : candidate.sourceText,
    };
  });
}

/** Sync extract of retailer product links + on-page prices. Does not invent prices. */
export function extractRetailerCandidates(html: string, pageUrl: string): RoundupCandidate[] {
  const $ = cheerio.load(html);
  const sdThread = isSlickdealsThreadUrl(pageUrl);
  const roots = sdThread ? slickdealsContentRoots($) : [contentRoot($, pageUrl)];
  const merged: RoundupCandidate[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    if (!root.length) continue;
    for (const candidate of collectFromRoot($, root, pageUrl)) {
      pushUnique(merged, seen, candidate);
    }
  }
  const sliced = merged.slice(0, ROUNDUP_CAP);
  return overlayDealBlogArticle(overlaySlickdealsThread(sliced, $, pageUrl), $, pageUrl);
}

function firstProductUrl(href: string): string | null {
  const nested = nestedRetailerUrls(href);
  for (const candidate of nested) {
    const merchant = detectMerchant(candidate);
    if (merchant !== "other" && extractMerchantProductId(candidate, merchant)) return candidate;
  }
  for (const candidate of nested) {
    if (candidate === href) continue;
    if (isDealForumUrl(candidate) || isClickWrapper(candidate)) continue;
    try {
      const path = new URL(candidate).pathname.split("/").filter(Boolean);
      if (path.length >= 2) return candidate;
    } catch {
      // ignore
    }
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
    if (step > 0 && !isClickWrapper(current) && !isDealForumUrl(current) && !isRetailerShortUrl(current)) {
      return current;
    }
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


function hasUsableTitle(title: string | null | undefined): boolean {
  const trimmed = title?.trim() ?? "";
  if (!trimmed) return false;
  return !/^untitled(?:\s+deal)?$/i.test(trimmed);
}

function listingHostLabel(url: string | null | undefined): string | null {
  if (!url) return null;
  if (isDealForumUrl(url) || isClickWrapper(url)) return null;
  return hostnameOf(url);
}

function buildIngestNotes(input: {
  unwrapFailed: boolean;
  currentPrice: number | null;
  image: ReturnType<typeof resolveDealImage>;
  merchant: Merchant;
  productId: string | null;
  sourceUrl?: string | null;
}): string | null {
  const host = input.merchant === "other" ? listingHostLabel(input.sourceUrl) : null;
  const imageMissing =
    input.image.imageTier === "placeholder" && !cdnImageFor(input.merchant, input.productId);
  const imageNote = imageMissing
    ? host
      ? `Paste the product Image URL from ${host}. Do not generate a lifestyle shot.`
      : "Paste the product Image URL from the listing. Do not generate a lifestyle shot."
    : null;
  const notes = [
    input.unwrapFailed ? "Short link did not unwrap. Confirm the retailer URL before Ready." : null,
    input.currentPrice == null ? "Paste the live price from the listing. Do not invent one." : null,
    imageNote,
  ]
    .filter(Boolean)
    .join(" ");
  return notes || null;
}

/** True when a roundup card still needs a retailer listing fetch for a product photo. */
export function shouldFetchRetailerListing(input: {
  merchant: Merchant;
  productId: string | null;
  url: string;
  scrapedImageUrl?: string | null;
}): boolean {
  if (cdnImageFor(input.merchant, input.productId)) return false;
  if (input.scrapedImageUrl) return false;
  if (isDealForumUrl(input.url) || isClickWrapper(input.url)) return false;
  try {
    const path = new URL(input.url).pathname.split("/").filter(Boolean);
    if (path.length === 0) return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * Attach og:image / JSON-LD photo (and a missing price/title) from already-fetched listing HTML.
 * Does not rewrite OP mechanics, summary, or bullets. Does not overwrite an existing price or title.
 */
export function hydrateDealFromListingHtml(deal: ParsedDeal, html: string): ParsedDeal {
  const extracted = extractFromHtml(html, deal.merchant);
  const alreadyHasPhoto =
    Boolean(cdnImageFor(deal.merchant, deal.merchantProductId)) ||
    Boolean(deal.scrapedImageUrl) ||
    deal.imageTier === "cdn" ||
    deal.imageTier === "scraped";
  const image = alreadyHasPhoto
    ? {
        imageUrl: deal.imageUrl,
        imageTier: deal.imageTier,
        cdnUrl: cdnImageFor(deal.merchant, deal.merchantProductId),
      }
    : resolveDealImage({
        scrapedImageUrl: extracted.scrapedImageUrl,
        merchant: deal.merchant,
        merchantProductId: deal.merchantProductId,
      });
  const currentPrice = deal.currentPrice ?? extracted.currentPrice;
  const listingTitle =
    extracted.title && !looksLikeChallengeCopy(extracted.title)
      ? extracted.title.replace(/\s+/g, " ").trim().slice(0, 140)
      : null;
  const title = hasUsableTitle(deal.title) ? deal.title : listingTitle || deal.title;
  const unwrapFailed = /Short link did not unwrap/i.test(deal.scrapeNote ?? "");
  const scrapedImageUrl = alreadyHasPhoto
    ? deal.scrapedImageUrl
    : (extracted.scrapedImageUrl ?? (image.imageTier === "cdn" ? image.imageUrl : null));
  return {
    ...deal,
    title,
    currentPrice,
    scrapedImageUrl,
    imageUrl: image.imageUrl,
    imageTier: image.imageTier,
    pricesBlocked: currentPrice == null,
    scrapeNote: buildIngestNotes({
      unwrapFailed,
      currentPrice,
      image,
      merchant: deal.merchant,
      productId: deal.merchantProductId,
      sourceUrl: deal.sourceUrl,
    }),
  };
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
  const mechanics = extractDealMechanics(candidate.sourceText ?? "");
  const promoCode = mechanics.promoCode;
  const extra = hasExtraMechanics(mechanics);
  const bullets = extra
    ? buildMechanicsBullets({
        merchant,
        currentPrice,
        listPrice,
        percentOff: discountPercent(currentPrice, listPrice),
        mechanics,
      })
    : buildDanBullets({
        merchant,
        currentPrice,
        listPrice,
        percentOff: discountPercent(currentPrice, listPrice),
        promoCode,
      });
  const stackingSteps = extra
    ? buildMechanicsSteps({ merchant, currentPrice, mechanics })
    : buildStackingSteps({ merchant, promoCode, currentPrice });
  const summaryRaw = extra ? buildMechanicsWhy({ merchant, currentPrice, mechanics }) : null;
  const summary = summaryRaw && !looksClonedWriteup(summaryRaw) ? summaryRaw : null;
  const writeupBlob = [bullets.join(" "), stackingSteps.map((step) => `${step.title} ${step.detail}`).join(" "), summary ?? ""].join(
    " ",
  );
  if (looksClonedWriteup(writeupBlob)) {
    const fallbackBullets = buildDanBullets({
      merchant,
      currentPrice,
      listPrice,
      percentOff: discountPercent(currentPrice, listPrice),
      promoCode,
    });
    const fallbackSteps = buildStackingSteps({ merchant, promoCode, currentPrice });
    return finishParsed({
      merchant,
      productId,
      sourceUrl,
      affiliateUrl,
      image,
      title: candidate.title || "Untitled deal",
      currentPrice,
      listPrice,
      bullets: fallbackBullets,
      stackingSteps: fallbackSteps,
      unwrapFailed,
      promoCode,
      clipCoupon: mechanics.clipCoupon,
      subscribeSave: mechanics.subscribeSave,
      summary: null,
    });
  }
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
    stackingSteps,
    socialPost: "",
    pricesBlocked: currentPrice == null,
    scrapeNote: buildIngestNotes({
      unwrapFailed,
      currentPrice,
      image,
      merchant,
      productId,
      sourceUrl,
    }),
    promoCode,
    clipCoupon: mechanics.clipCoupon,
    subscribeSave: mechanics.subscribeSave,
    summary,
  };
}

function finishParsed(input: {
  merchant: Merchant;
  productId: string | null;
  sourceUrl: string;
  affiliateUrl: string;
  image: ReturnType<typeof resolveDealImage>;
  title: string;
  currentPrice: number | null;
  listPrice: number | null;
  bullets: string[];
  stackingSteps: ReturnType<typeof buildStackingSteps>;
  unwrapFailed: boolean;
  promoCode: string | null;
  clipCoupon: boolean;
  subscribeSave: boolean;
  summary: string | null;
}): ParsedDeal {
  return {
    merchant: input.merchant,
    merchantProductId: input.productId,
    sourceUrl: input.sourceUrl,
    affiliateUrl: input.affiliateUrl,
    title: input.title,
    currentPrice: input.currentPrice,
    listPrice: input.listPrice,
    scrapedImageUrl: input.image.imageTier === "cdn" ? input.image.imageUrl : null,
    imageUrl: input.image.imageUrl,
    imageTier: input.image.imageTier,
    bullets: input.bullets,
    stackingSteps: input.stackingSteps,
    socialPost: "",
    pricesBlocked: input.currentPrice == null,
    scrapeNote: buildIngestNotes({
      unwrapFailed: input.unwrapFailed,
      currentPrice: input.currentPrice,
      image: input.image,
      merchant: input.merchant,
      productId: input.productId,
      sourceUrl: input.sourceUrl,
    }),
    promoCode: input.promoCode,
    clipCoupon: input.clipCoupon,
    subscribeSave: input.subscribeSave,
    summary: input.summary,
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
  let droppedWrappers = 0;
  for (const candidate of candidates) {
    let unwrapped = candidate.href;
    let unwrapFailed = false;
    if (hrefNeedsUnwrap(candidate.href)) {
      unwrapped = await unwrapRedirects(candidate.href);
      if (isDealForumUrl(unwrapped) || (isClickWrapper(unwrapped) && detectMerchant(unwrapped) === "other")) {
        droppedWrappers += 1;
        continue;
      }
      const merchant = detectMerchant(unwrapped);
      if (merchant === "other" || !extractMerchantProductId(unwrapped, merchant)) {
        unwrapFailed = isRetailerShortUrl(candidate.href) || isClickWrapper(candidate.href);
        if (!isDealForumUrl(unwrapped) && !isClickWrapper(unwrapped) && merchant === "other") {
          unwrapFailed = false;
        }
      }
    } else if (isDealForumUrl(unwrapped)) {
      droppedWrappers += 1;
      continue;
    }
    const deal = parsedFromCandidate(candidate, unwrapped, unwrapFailed);
    const key = listingKey(deal.sourceUrl, deal.merchant, deal.merchantProductId);
    if (seen.has(key)) continue;
    seen.add(key);
    if (
      shouldFetchRetailerListing({
        merchant: deal.merchant,
        productId: deal.merchantProductId,
        url: deal.sourceUrl,
        scrapedImageUrl: deal.scrapedImageUrl,
      })
    ) {
      const listing = await fetchHtml(deal.sourceUrl);
      deals.push(listing ? hydrateDealFromListingHtml(deal, listing.html) : deal);
      continue;
    }
    deals.push(deal);
  }

  if (deals.length === 0) {
    return {
      deals: [],
      scrapeNote: droppedWrappers
        ? "Could not unwrap the retailer link from that thread. Paste the store product URL. Do not invent one."
        : "No retailer product links found on that page. Paste an Amazon, Walmart, Target, Home Depot, Best Buy, Costco, Newegg, eBay, Kohl's, Dick's, or Office Depot product URL.",
    };
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

/** Paste handler for /admin: mixed text, retailer listing, or third-party deal page. */
export async function ingestDealPaste(rawUrl: string): Promise<IngestResult> {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new ParseDealError("Paste a product URL to parse.");
  const target = resolvePasteTarget(trimmed);
  if (!target) throw new ParseDealError("That does not look like a valid URL.");
  if (isNonDealHost(target) && !isRetailerProductUrl(target)) {
    return {
      deals: [],
      scrapeNote:
        "Paste a retailer product URL or a single deal article. Tweets and social posts cannot be scraped.",
    };
  }
  if (isDealHubUrl(target)) {
    return { deals: [], scrapeNote: HUB_REFUSE_NOTE };
  }
  if (isSlickdealsThreadUrl(target)) {
    return ingestThirdPartyPage(target);
  }
  if (looksLikeDirectListing(target)) {
    const parsed = await parseDealUrl(target);
    return { deals: [parsed], scrapeNote: parsed.scrapeNote };
  }
  return ingestThirdPartyPage(target);
}
