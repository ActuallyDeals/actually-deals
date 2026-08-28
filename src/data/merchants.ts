import type { Merchant } from "@/lib/types";

export const MERCHANTS: Merchant[] = [
  {
    id: "merchant-amazon",
    name: "Amazon",
    slug: "amazon",
    domain: "amazon.com",
    logoUrl: null,
    emoji: "📦",
    affiliateTemplate: null,
  },
  {
    id: "merchant-target",
    name: "Target",
    slug: "target",
    domain: "target.com",
    logoUrl: null,
    emoji: "🎯",
    affiliateTemplate: null,
  },
  {
    id: "merchant-home-depot",
    name: "Home Depot",
    slug: "home-depot",
    domain: "homedepot.com",
    logoUrl: null,
    emoji: "🏠",
    affiliateTemplate: null,
  },
  {
    id: "merchant-walmart",
    name: "Walmart",
    slug: "walmart",
    domain: "walmart.com",
    logoUrl: null,
    emoji: "🛒",
    affiliateTemplate: null,
  },
  {
    id: "merchant-best-buy",
    name: "Best Buy",
    slug: "best-buy",
    domain: "bestbuy.com",
    logoUrl: null,
    emoji: "💻",
    affiliateTemplate: null,
  },
  {
    id: "merchant-costco",
    name: "Costco",
    slug: "costco",
    domain: "costco.com",
    logoUrl: null,
    emoji: "🏬",
    affiliateTemplate: null,
  },
  {
    id: "merchant-macys",
    name: "Macy's",
    slug: "macys",
    domain: "macys.com",
    logoUrl: null,
    emoji: "🛍️",
    affiliateTemplate: null,
  },
];

export function merchantByName(name: string): Merchant | undefined {
  return MERCHANTS.find(
    (merchant) => merchant.name.toLowerCase() === name.toLowerCase(),
  );
}

export function merchantEmoji(name: string): string {
  return merchantByName(name)?.emoji ?? "🛍️";
}
