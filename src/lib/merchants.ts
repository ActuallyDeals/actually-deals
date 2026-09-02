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
  newegg: {
    id: "newegg",
    label: "Newegg",
    hostMatches: ["newegg."],
    color: "#E57200",
  },
  ebay: {
    id: "ebay",
    label: "eBay",
    hostMatches: ["ebay.", "ebay.us"],
    color: "#E53238",
  },
  kohls: {
    id: "kohls",
    label: "Kohl's",
    hostMatches: ["kohls."],
    color: "#702F8A",
  },
  dicks: {
    id: "dicks",
    label: "Dick's",
    hostMatches: ["dickssportinggoods."],
    color: "#046A38",
  },
  "office-depot": {
    id: "office-depot",
    label: "Office Depot",
    hostMatches: ["officedepot.", "officemax."],
    color: "#CC0000",
  },
  booking: {
    id: "booking",
    label: "Booking.com",
    hostMatches: ["booking."],
    color: "#003580",
  },
  expedia: {
    id: "expedia",
    label: "Expedia",
    hostMatches: ["expedia."],
    color: "#F5C518",
  },
  hotels: {
    id: "hotels",
    label: "Hotels.com",
    hostMatches: ["hotels.com"],
    color: "#D32F2F",
  },
  uber: {
    id: "uber",
    label: "Uber",
    hostMatches: ["uber.com", "ubereats.com", "postmates.com"],
    color: "#000000",
  },
  doordash: {
    id: "doordash",
    label: "DoorDash",
    hostMatches: ["doordash.com"],
    color: "#FF3008",
  },
  grubhub: {
    id: "grubhub",
    label: "Grubhub",
    hostMatches: ["grubhub.com"],
    color: "#F63440",
  },
  other: {
    id: "other",
    label: "Store",
    hostMatches: [],
    color: "#0F172A",
  },
};

function hostnameMatches(host: string, part: string): boolean {
  const h = host.toLowerCase();
  const p = part.toLowerCase();
  if (!p) return false;
  // "amazon." / "booking." — SLD plus dot, including ccTLDs.
  if (p.endsWith(".")) return h.includes(p);
  // Full host like "hotels.com" / "uber.com" — suffix only, not choicehotels.com.
  return h === p || h.endsWith(`.${p}`);
}

export function detectMerchant(rawUrl: string): Merchant {
  let host = "";
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    host = rawUrl.toLowerCase();
  }

  for (const profile of Object.values(MERCHANT_PROFILES)) {
    if (profile.id === "other") continue;
    if (profile.hostMatches.some((part) => hostnameMatches(host, part))) {
      return profile.id;
    }
  }
  return "other";
}

const COMPOUND_TAILS = ["furniture"] as const;
const MULTI_TLD_SLD = new Set(["co", "com", "org", "net", "ac", "gov"]);
const SKIP_STORE_HOSTS = [
  "slickdeals.net",
  "sldc.net",
  "sdclick.com",
  "sdclick.net",
  "linksynergy.com",
  "geniuslink.com",
  "geni.us",
];

function titleCaseToken(token: string): string {
  if (!token) return "";
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function expandCompounds(token: string): string {
  const lower = token.toLowerCase();
  for (const tail of COMPOUND_TAILS) {
    if (lower.length > tail.length + 2 && lower.endsWith(tail)) {
      const head = lower.slice(0, -tail.length);
      if (/^[a-z]+$/.test(head)) return `${titleCaseToken(head)} ${titleCaseToken(tail)}`;
    }
  }
  return titleCaseToken(lower);
}

function hostnameFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const candidate = /^(https?:\/\/|\/\/)/i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const host = new URL(candidate).hostname.toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

/** Short store name from a listing host. ashleyfurniture.com → Ashley Furniture. */
export function storeLabelFromUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl?.trim()) return "Store";
  const host = hostnameFromInput(rawUrl);
  if (!host) return "Store";
  const hostNoWww = host.replace(/^www\./, "");
  if (SKIP_STORE_HOSTS.some((part) => hostNoWww === part || hostNoWww.endsWith(`.${part}`))) {
    return "Store";
  }

  const parts = host.split(".").filter(Boolean);
  while (parts.length > 1 && (parts[0] === "www" || parts[0] === "m" || parts[0] === "shop")) {
    parts.shift();
  }
  if (parts.length < 2) return "Store";

  let name = parts[parts.length - 2];
  const tld = parts[parts.length - 1];
  const sld = parts[parts.length - 2];
  if (parts.length >= 3 && tld.length === 2 && MULTI_TLD_SLD.has(sld)) {
    name = parts[parts.length - 3];
  }
  if (!name || name.length < 2 || /^\d+$/.test(name)) return "Store";

  const tokens = name.split(/[-_]+/).filter(Boolean);
  if (!tokens.length) return "Store";
  return tokens.map(expandCompounds).join(" ");
}

export function merchantLabel(merchant: Merchant, listingUrl?: string | null): string {
  if (merchant !== "other") return MERCHANT_PROFILES[merchant].label;
  return storeLabelFromUrl(listingUrl);
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
      case "newegg": {
        const fromPath = path.match(/\/p\/(N82E\d+|9SI[A-Z0-9]+)/i)?.[1];
        const fromQuery = url.searchParams.get("Item") ?? url.searchParams.get("item");
        const candidate = fromPath ?? fromQuery;
        if (candidate && /^(N82E\d+|9SI[A-Z0-9]+)$/i.test(candidate)) {
          return candidate.toUpperCase();
        }
        return null;
      }
      case "ebay": {
        const fromPath = path.match(/\/itm\/(?:[^/]+\/)?(\d{9,15})(?:\/|$)/)?.[1];
        const fromQuery = url.searchParams.get("item") ?? url.searchParams.get("itm");
        const candidate = fromPath ?? fromQuery;
        if (candidate && /^\d{9,15}$/.test(candidate)) return candidate;
        return null;
      }
      case "kohls": {
        const fromPath = path.match(/\/prd-(\d+)/i)?.[1];
        const fromQuery = url.searchParams.get("prd") ?? url.searchParams.get("productId");
        const candidate = fromPath ?? fromQuery;
        if (candidate && /^\d+$/.test(candidate)) return candidate;
        return null;
      }
      case "dicks": {
        const fromQuery = url.searchParams.get("productId") ?? url.searchParams.get("sku");
        if (fromQuery && /^[A-Za-z0-9-]{4,40}$/.test(fromQuery)) return fromQuery;
        const segments = path.split("/").filter(Boolean);
        const pIndex = segments.findIndex((seg) => seg.toLowerCase() === "p");
        if (pIndex >= 0) {
          const last = segments[segments.length - 1].replace(/\.(?:html|jsp).*$/i, "");
          if (/^\d{5,}$/.test(last)) return last;
        }
        return null;
      }
      case "office-depot": {
        const fromPath = path.match(/\/a\/products\/(\d+)/i)?.[1];
        const fromQuery = url.searchParams.get("productId") ?? url.searchParams.get("sku");
        const candidate = fromPath ?? fromQuery;
        if (candidate && /^\d+$/.test(candidate)) return candidate;
        return null;
      }
      case "booking": {
        const fromQuery = url.searchParams.get("hotel_id");
        if (fromQuery && /^\d{4,}$/.test(fromQuery)) return fromQuery;
        const hotelPath = path.match(/\/hotel\/([a-z]{2})\/([^/]+?)(?:\.html)?(?:\/|$)/i);
        if (hotelPath) {
          const slug = hotelPath[2].replace(/\.html$/i, "");
          if (slug && !/^\d+$/.test(slug) && slug.length >= 2) {
            return `${hotelPath[1].toLowerCase()}/${slug.toLowerCase()}`;
          }
        }
        return null;
      }
      case "expedia":
      case "hotels": {
        const fromPath =
          path.match(/\.h(\d{3,})(?:\.|\/|$)/i)?.[1] ??
          path.match(/\/ho(\d{3,})(?:\/|$)/i)?.[1] ??
          path.match(/\/(?:hotel\/info|h)(?:\/|\.)(\d{3,})(?:\/|$)/i)?.[2];
        const fromQuery =
          url.searchParams.get("hotelId") ??
          url.searchParams.get("selectedHotelId") ??
          url.searchParams.get("hotel_id");
        const candidate = fromPath ?? fromQuery;
        if (candidate && /^\d{3,}$/.test(candidate)) return candidate;
        return null;
      }
      case "uber":
      case "doordash":
      case "grubhub":
        return null;
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
