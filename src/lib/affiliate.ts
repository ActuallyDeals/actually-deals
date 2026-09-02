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
  "langid",
  "mkcid",
  "mkrid",
  "campid",
  "toolid",
  "mkevt",
  "customid",
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

/** Known CJ publisher website ID from our account. Prefer AFFILIATE_CJ_PID. */
export const CJ_PUBLISHER_PID = "8059705";

/**
 * Dick's Sporting Goods CJ advertiser ID from the advertiser page.
 * Relationship is not joined yet — wrap is still emitted so it works after they join.
 * Prefer AFFILIATE_CJ_DICKS_AID.
 */
export const CJ_DICKS_ADVERTISER_ID = "7345657";

/** Remembered Rakuten Advertising / Linkshare SID. Prefer AFFILIATE_RAKUTEN_SID. */
export const RAKUTEN_SID = "4745711";

/**
 * CJ deep-link form used here (query shape only; no network call):
 * https://www.anrdoezrs.net/click-{PID}-{AID}?url={ENCODED_DEST}
 * AID is the CJ advertiser ID for the merchant.
 */
function cjDeepLink(pid: string, aid: string, dest: string): string {
  return `https://www.anrdoezrs.net/click-${encodeURIComponent(pid)}-${encodeURIComponent(aid)}?url=${encodeURIComponent(dest)}`;
}

function impactDeepLink(host: string, partnerId: string, dest: string): string {
  return `https://${host}/c/${encodeURIComponent(partnerId)}?u=${encodeURIComponent(dest)}`;
}

function rakutenDeepLink(sid: string, mid: string, dest: string): string {
  const wrap = new URL("https://click.linksynergy.com/deeplink");
  wrap.searchParams.set("id", sid);
  wrap.searchParams.set("mid", mid);
  wrap.searchParams.set("murl", dest);
  return wrap.toString();
}

export function affiliateTags() {
  return {
    amazon:
      envValue("AFFILIATE_AMAZON_TAG", "NEXT_PUBLIC_AMAZON_AFFILIATE_TAG") || AMAZON_ASSOCIATE_TAG,
    walmart: envValue("AFFILIATE_WALMART_ID", "NEXT_PUBLIC_WALMART_AFFILIATE_URL"),
    target: envValue("AFFILIATE_TARGET_ID", "NEXT_PUBLIC_TARGET_AFFILIATE_URL"),
    "home-depot": envValue("AFFILIATE_HOMEDEPOT_ID", "NEXT_PUBLIC_HOME_DEPOT_AFFILIATE_URL"),
    "best-buy": envValue("AFFILIATE_BESTBUY_ID", "NEXT_PUBLIC_BEST_BUY_AFFILIATE_URL"),
    kohls: envValue("AFFILIATE_KOHLS_ID"),
    cjPid: envValue("AFFILIATE_CJ_PID") || CJ_PUBLISHER_PID,
    dicksAid: envValue("AFFILIATE_CJ_DICKS_AID") || CJ_DICKS_ADVERTISER_ID,
    officeDepotAid: envValue("AFFILIATE_CJ_OFFICE_DEPOT_AID"),
    bookingAid: envValue("AFFILIATE_CJ_BOOKING_AID"),
    expediaAid: envValue("AFFILIATE_CJ_EXPEDIA_AID"),
    hotelsAid: envValue("AFFILIATE_CJ_HOTELS_AID"),
    ebayCampaignId: envValue("AFFILIATE_EBAY_CAMPAIGN_ID"),
    rakutenSid: envValue("AFFILIATE_RAKUTEN_SID") || RAKUTEN_SID,
    neweggMid: envValue("AFFILIATE_NEWEGG_MID"),
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
    const dest = url.toString();

    switch (merchant) {
      case "amazon":
        if (tags.amazon) url.searchParams.set("tag", tags.amazon);
        return url.toString();
      case "walmart":
        return tags.walmart ? impactDeepLink("goto.walmart.com", tags.walmart, dest) : dest;
      case "target":
        return tags.target ? impactDeepLink("goto.target.com", tags.target, dest) : dest;
      case "home-depot":
        return tags["home-depot"]
          ? impactDeepLink("homedepot.sjv.io", tags["home-depot"], dest)
          : dest;
      case "best-buy":
        return tags["best-buy"] ? impactDeepLink("bestbuy.7tiv.net", tags["best-buy"], dest) : dest;
      case "kohls":
        return tags.kohls ? impactDeepLink("kohls.sjv.io", tags.kohls, dest) : dest;
      case "dicks":
        return tags.cjPid && tags.dicksAid ? cjDeepLink(tags.cjPid, tags.dicksAid, dest) : dest;
      case "office-depot":
        return tags.cjPid && tags.officeDepotAid
          ? cjDeepLink(tags.cjPid, tags.officeDepotAid, dest)
          : dest;
      case "booking":
        return tags.cjPid && tags.bookingAid ? cjDeepLink(tags.cjPid, tags.bookingAid, dest) : dest;
      case "expedia":
        return tags.cjPid && tags.expediaAid ? cjDeepLink(tags.cjPid, tags.expediaAid, dest) : dest;
      case "hotels":
        return tags.cjPid && tags.hotelsAid ? cjDeepLink(tags.cjPid, tags.hotelsAid, dest) : dest;
      case "ebay": {

        if (!tags.ebayCampaignId) return dest;
        url.searchParams.set("mkcid", "1");
        url.searchParams.set("mkrid", "711-53200-19255-0");
        url.searchParams.set("campid", tags.ebayCampaignId);
        url.searchParams.set("toolid", "10001");
        url.searchParams.set("mkevt", "1");
        return url.toString();
      }
      case "newegg":
        return tags.rakutenSid && tags.neweggMid
          ? rakutenDeepLink(tags.rakutenSid, tags.neweggMid, dest)
          : dest;
      default:
        return dest;
    }
  } catch {
    return cleaned;
  }
}
