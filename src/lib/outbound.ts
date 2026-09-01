import { extractMerchantProductId } from "@/lib/merchants";
import type { Merchant } from "@/lib/types";

const HOMEPAGE_PATHS = new Set(["", "/", "/gp/homepage", "/home", "/index.html"]);

/** True only when the URL is a product deep link, not a retailer homepage. */
export function isProductOutboundUrl(rawUrl: string, merchant: Merchant): boolean {
  try {
    const url = new URL(rawUrl);
    const path = (url.pathname.replace(/\/+$/, "") || "/").toLowerCase();
    if (HOMEPAGE_PATHS.has(path)) return false;
    if (merchant === "other") {
      return path.split("/").filter(Boolean).length >= 2;
    }
    return Boolean(extractMerchantProductId(url.toString(), merchant));
  } catch {
    return false;
  }
}

export function dealHasProductLink(deal: { sourceUrl: string; affiliateUrl: string; merchant: Merchant }): boolean {
  return isProductOutboundUrl(deal.sourceUrl, deal.merchant);
}

const RETAILER_SHORT_HOSTS = [
  "amzn.to",
  "amzn.com",
  "a.co",
  "w-mt.co",
  "tgt.biz",
  "thd.co",
  "bbyurl.us",
  "ebay.us",
  "ebay.to",
];

/** Amazon/Walmart/Target/etc short links that still need an unwrap to a product URL. */
export function isRetailerShortUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "");
    return RETAILER_SHORT_HOSTS.some((part) => host === part || host.endsWith(`.${part}`));
  } catch {
    return false;
  }
}

/** Product listing or retailer short link — not a third-party deal blog. */
export function isDirectRetailerListing(rawUrl: string, merchant: Merchant): boolean {
  if (merchant === "other") return false;
  if (isRetailerShortUrl(rawUrl)) return true;
  return isProductOutboundUrl(rawUrl, merchant);
}

/** Food/delivery (or other) coupon with a code and no product deep link. */
export function isCouponOnlyDeal(deal: {
  promoCode?: string | null;
  sourceUrl?: string | null;
  merchant: Merchant;
}): boolean {
  if (!deal.promoCode?.trim()) return false;
  const url = deal.sourceUrl?.trim() ?? "";
  if (!url) return true;
  try {
    return !isDirectRetailerListing(url, deal.merchant);
  } catch {
    return true;
  }
}

