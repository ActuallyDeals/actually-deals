import { detectMerchant } from "@/lib/merchants";
import type { Merchant } from "@/lib/types";

const TRACKING_EXACT = new Set([
  "tag",
  "ref",
  "ref_",
  "th",
  "psc",
  "smid",
  "linkcode",
  "camp",
  "creative",
  "creativeasin",
  "ascsubtag",
  "asc_campaign",
  "asc_refurl",
  "asc_source",
  "gclid",
  "fbclid",
  "msclkid",
  "dclid",
  "gbraid",
  "wbraid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "si",
  "_encoding",
  "ie",
  "qid",
  "sr",
  "sprefix",
  "crid",
  "dib",
  "dib_tag",
  "sp_csd",
  "content-id",
  "pd_rd_w",
  "pd_rd_wg",
  "pd_rd_r",
  "pf_rd_p",
  "pf_rd_r",
  "pf_rd_s",
  "pf_rd_t",
  "pf_rd_i",
  "pf_rd_m",
  "refid",
  "athcpid",
  "athpgid",
  "athznid",
  "athmtid",
  "athstid",
  "wmlspartner",
  "veh",
  "wl13",
  "adsredirect",
  "afsrc",
  "cm_mmc",
  "irgwc",
  "irclickid",
  "clickid",
  "clkid",
  "icid",
  "cmpid",
  "sharedid",
  "u1",
  "subid",
  "subid1",
  "subid2",
]);

const TRACKING_PREFIXES = ["utm_", "pf_rd_", "pd_rd_", "mc_", "nr_", "amp;"];

function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  if (TRACKING_EXACT.has(lower)) return true;
  return TRACKING_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/** Desk paste: amazon.com/dp/... still parses. */
export function withHttps(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function cleanTrackingParams(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  const kept = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    if (!isTrackingParam(key)) kept.append(key, value);
  });
  url.search = kept.toString();
  url.hash = "";
  return url.toString();
}

function envValue(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

/** Live Amazon Associates tracking tag / Store ID. `actuallydeals-20` is not available. */
export const AMAZON_ASSOCIATE_TAG = "actuallydea07-20";

export function affiliateTags() {
  return {
    amazon:
      envValue("AFFILIATE_AMAZON_TAG", "NEXT_PUBLIC_AMAZON_AFFILIATE_TAG") || AMAZON_ASSOCIATE_TAG,
    walmart: envValue("AFFILIATE_WALMART_ID", "NEXT_PUBLIC_WALMART_AFFILIATE_URL"),
    target: envValue("AFFILIATE_TARGET_ID", "NEXT_PUBLIC_TARGET_AFFILIATE_URL"),
    "home-depot": envValue("AFFILIATE_HOMEDEPOT_ID", "NEXT_PUBLIC_HOME_DEPOT_AFFILIATE_URL"),
    "best-buy": envValue("AFFILIATE_BESTBUY_ID", "NEXT_PUBLIC_BEST_BUY_AFFILIATE_URL"),
  };
}

export function attachAffiliate(
  rawUrl: string,
  merchant: Merchant = detectMerchant(rawUrl),
): string {
  const cleaned = cleanTrackingParams(rawUrl);
  const tags = affiliateTags();

  try {
    const url = new URL(cleaned);

    switch (merchant) {
      case "amazon":
        if (tags.amazon) url.searchParams.set("tag", tags.amazon);
        return url.toString();
      case "walmart":
        if (tags.walmart) {
          return `https://goto.walmart.com/c/${encodeURIComponent(tags.walmart)}?u=${encodeURIComponent(url.toString())}`;
        }
        return url.toString();
      case "target":
        if (tags.target) {
          return `https://goto.target.com/c/${encodeURIComponent(tags.target)}?u=${encodeURIComponent(url.toString())}`;
        }
        return url.toString();
      case "home-depot":
        if (tags["home-depot"]) {
          return `https://homedepot.sjv.io/c/${encodeURIComponent(tags["home-depot"])}?u=${encodeURIComponent(url.toString())}`;
        }
        return url.toString();
      case "best-buy":
        if (tags["best-buy"]) {
          return `https://bestbuy.7tiv.net/c/${encodeURIComponent(tags["best-buy"])}?u=${encodeURIComponent(url.toString())}`;
        }
        return url.toString();
      default:
        return url.toString();
    }
  } catch {
    return cleaned;
  }
}
