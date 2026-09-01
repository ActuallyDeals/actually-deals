import type { Merchant } from "@/lib/types";

export interface MerchantProfile {
  id: Merchant;
  label: string;
  hostMatches: string[];
  color: string;
}

export const MERCHANT_PROFILES: Record<Merchant, MerchantProfile> = {
  amazon: {
    id: "amazon",
    label: "Amazon",
    hostMatches: ["amazon.", "amzn.to", "amzn.com", "a.co"],
    color: "#FF9900",
  },
  walmart: {
    id: "walmart",
    label: "Walmart",
    hostMatches: ["walmart.", "w-mt.co"],
    color: "#0071CE",
  },
  target: {
    id: "target",
    label: "Target",
    hostMatches: ["target.", "tgt.biz"],
    color: "#CC0000",
  },
  "home-depot": {
    id: "home-depot",
    label: "Home Depot",
    hostMatches: ["homedepot.", "thd.co"],
    color: "#F96302",
  },
  "best-buy": {
    id: "best-buy",
    label: "Best Buy",
    hostMatches: ["bestbuy.", "bbyurl.us"],
    color: "#0046BE",
  },
  costco: {
    id: "costco",
    label: "Costco",
    hostMatches: ["costco."],
    color: "#E31837",
  },
  other: {
    id: "other",
    label: "Store",
    hostMatches: [],
    color: "#0F172A",
  },
};

export function detectMerchant(rawUrl: string): Merchant {
  let host = "";
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    host = rawUrl.toLowerCase();
  }

  for (const profile of Object.values(MERCHANT_PROFILES)) {
    if (profile.id === "other") continue;
    if (profile.hostMatches.some((part) => host.includes(part))) {
      return profile.id;
    }
  }
  return "other";
}

export function merchantLabel(merchant: Merchant): string {
  return MERCHANT_PROFILES[merchant].label;
}

const ASIN = /(?:[/](?:dp|gp\/product|gp\/aw\/d|d)[/])([A-Z0-9]{10})(?:[/?]|$)/i;
const ASIN_QUERY = /[?&](?:asin|ASIN)=([A-Z0-9]{10})/;

export function extractMerchantProductId(rawUrl: string, merchant: Merchant): string | null {
  try {
    const url = new URL(rawUrl);
    const path = url.pathname;

    switch (merchant) {
      case "amazon": {
        const fromPath = path.match(ASIN)?.[1];
        if (fromPath) return fromPath.toUpperCase();
        const fromQuery = rawUrl.match(ASIN_QUERY)?.[1];
        return fromQuery ? fromQuery.toUpperCase() : null;
      }
      case "walmart": {
        const ip = path.match(/\/ip\/(?:[^/]+\/)?(\d{5,})/i)?.[1];
        return ip ?? url.searchParams.get("id");
      }
      case "target": {
        return path.match(/\/A-(\d{8,})/i)?.[1] ?? url.searchParams.get("tcin");
      }
      case "home-depot": {
        const trailing = path.match(/\/(\d{7,})(?:\.|$)/)?.[1];
        return trailing ?? url.searchParams.get("itemid");
      }
      case "best-buy": {
        return (
          url.searchParams.get("skuId") ??
          path.match(/\/(\d{6,})\.p(?:$|\/)/i)?.[1] ??
          null
        );
      }
      case "costco": {
        const segments = path.split("/").filter(Boolean);
        for (let i = segments.length - 1; i >= 0; i -= 1) {
          const seg = segments[i].replace(/\.(?:html|product).*$/i, "");
          if (/^\d{6,}$/.test(seg)) return seg;
        }
        return null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export function amazonCdnImage(asin: string): string {
  return `https://m.media-amazon.com/images/P/${asin.toUpperCase()}.01._SCLZZZZZZZ_.jpg`;
}

export function amazonCdnFallback(asin: string): string {
  return `https://images-na.ssl-images-amazon.com/images/P/${asin.toUpperCase()}.01._SCLZZZZZZZ_.jpg`;
}

/** Lift a thumbnail Amazon media URL to the large product plate. */
export function upgradeAmazonImageUrl(url: string): string {
  if (!/amazon|ssl-images-amazon|media-amazon/i.test(url)) return url;
  if (/_SCLZZZZZZZ_|LZZZZZZZ|_AC_SL1[2-9]\d{2}_|_SL1[5-9]\d{2}_/i.test(url)) return url;
  const lifted = url.replace(/\._[A-Z0-9_,]+_\.(jpe?g|png|webp)(\?.*)?$/i, "._AC_SL1500_.$1$2");
  return lifted !== url ? lifted : url;
}
