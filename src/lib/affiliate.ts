const TRACKING_PARAMS = new Set([
  "tag",
  "ref",
  "ref_",
  "linkcode",
  "linkid",
  "ascsubtag",
  "creative",
  "creativeasin",
  "camp",
  "adid",
  "psc",
  "th",
  "pd_rd_w",
  "pd_rd_r",
  "pd_rd_wg",
  "pf_rd_p",
  "pf_rd_r",
  "qid",
  "sr",
  "s",
  "keywords",
  "dib",
  "dib_tag",
  "content-id",
  "colid",
  "coliid",
  "smid",
]);

export function stripTrackingParams(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return rawUrl.trim();
  }

  const kept = new URLSearchParams();
  parsed.searchParams.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (normalized.startsWith("utm_")) {
      return;
    }
    if (TRACKING_PARAMS.has(normalized)) {
      return;
    }
    kept.append(key, value);
  });

  parsed.search = kept.toString();
  parsed.hash = "";
  return parsed.toString();
}

export function extractAmazonAsin(rawUrl: string): string | null {
  const asinMatch = rawUrl.match(
    /(?:\/(?:dp|gp\/product|gp\/aw\/d|d)\/|asin=|\/ASIN\/)([A-Z0-9]{10})(?:[/?]|$)/i,
  );
  if (asinMatch?.[1]) {
    return asinMatch[1].toUpperCase();
  }

  const bare = rawUrl.match(/\b([A-Z0-9]{10})\b/i);
  if (bare && /amazon\./i.test(rawUrl)) {
    return bare[1].toUpperCase();
  }

  return null;
}

export function amazonCanonicalUrl(asin: string): string {
  return `https://www.amazon.com/dp/${asin}`;
}

export function amazonCdnImage(asin: string): string {
  return `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`;
}

export function detectMerchantFromUrl(rawUrl: string): {
  name: string;
  slug: string;
  domain: string;
} {
  let host = "";
  try {
    host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    host = "";
  }

  if (host.includes("amazon.")) {
    return { name: "Amazon", slug: "amazon", domain: "amazon.com" };
  }
  if (host.includes("walmart.")) {
    return { name: "Walmart", slug: "walmart", domain: "walmart.com" };
  }
  if (host.includes("target.")) {
    return { name: "Target", slug: "target", domain: "target.com" };
  }
  if (host.includes("bestbuy.")) {
    return { name: "Best Buy", slug: "best-buy", domain: "bestbuy.com" };
  }
  if (host.includes("homedepot.")) {
    return { name: "Home Depot", slug: "home-depot", domain: "homedepot.com" };
  }
  if (host.includes("costco.")) {
    return { name: "Costco", slug: "costco", domain: "costco.com" };
  }

  const fallbackHost = host || "merchant";
  const name = fallbackHost.split(".")[0] ?? "Merchant";
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    domain: fallbackHost,
  };
}

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function withQuery(url: string, params: Record<string, string>): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

function wrapRedirect(template: string | undefined, destination: string): string | null {
  if (!template) {
    return null;
  }

  return template
    .replaceAll("{url}", encodeURIComponent(destination))
    .replaceAll("{raw}", destination);
}

export function injectAffiliate(rawUrl: string): string {
  const cleaned = stripTrackingParams(rawUrl);
  let destination = cleaned;
  const merchant = detectMerchantFromUrl(cleaned);
  const asin = extractAmazonAsin(cleaned);

  if (merchant.slug === "amazon" && asin) {
    destination = amazonCanonicalUrl(asin);
  }

  if (merchant.slug === "amazon") {
    const tag = env("NEXT_PUBLIC_AMAZON_AFFILIATE_TAG");
    if (tag) {
      return withQuery(destination, { tag });
    }
  }

  const networkTemplate =
    env(`NEXT_PUBLIC_${merchant.slug.replace(/-/g, "_").toUpperCase()}_AFFILIATE_URL`) ??
    env("NEXT_PUBLIC_AFFILIATE_REDIRECT_TEMPLATE");

  return wrapRedirect(networkTemplate, destination) ?? destination;
}

export function publicDealUrl(slug: string): string {
  const site = env("NEXT_PUBLIC_SITE_URL") ?? "https://actuallydeals.com";
  return `${site.replace(/\/$/, "")}/deal/${slug}`;
}
