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
