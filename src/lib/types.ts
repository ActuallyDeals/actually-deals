export const DEAL_CATEGORIES = [
  "amazon-finds",
  "tech",
  "home",
  "apparel",
  "price-errors",
  "freebies",
  "general",
] as const;

export type DealCategory = (typeof DEAL_CATEGORIES)[number];

export type FeedFilter = "all" | "price-errors" | "coupon-stacks" | "amazon";

export type DealBulletKind = "price" | "shipping" | "action";

export type DealBullet = {
  kind: DealBulletKind;
  label: string;
  text: string;
};

export type StackingStep = {
  step: number;
  title: string;
  detail: string;
};

export type Deal = {
  id: string;
  title: string;
  slug: string;
  merchantId: string | null;
  merchantName: string;
  dealUrl: string;
  affiliateUrl: string;
  imageUrl: string;
  dealPrice: number | null;
  msrp: number | null;
  discountPercent: number | null;
  couponCode: string | null;
  bullets: DealBullet[];
  stackingSteps: StackingStep[];
  category: DealCategory;
  isPriceError: boolean;
  isStackingHack: boolean;
  isFeatured: boolean;
  isExpired: boolean;
  upvotes: number;
  downvotes: number;
  clickCount: number;
  postedBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Merchant = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  logoUrl: string | null;
  emoji: string;
  affiliateTemplate: string | null;
};

export type DealComment = {
  id: string;
  dealId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type DealVote = {
  dealId: string;
  isAlive: boolean;
};

export type ParsedDealPackage = {
  sourceUrl: string;
  cleanedUrl: string;
  canonicalUrl: string;
  merchantName: string;
  merchantSlug: string;
  asin: string | null;
  title: string;
  imageUrl: string;
  imageSource: "opengraph" | "amazon-cdn" | "fallback";
  dealPrice: number | null;
  msrp: number | null;
  discountPercent: number | null;
  couponCode: string | null;
  headline: string;
  bullets: DealBullet[];
  stackingSteps: StackingStep[];
  socialPost: string;
  pricesBlocked: boolean;
  scrapeNote: string | null;
};

export type DealDraft = {
  title: string;
  slug: string;
  merchantName: string;
  dealUrl: string;
  imageUrl: string;
  dealPrice: string;
  msrp: string;
  couponCode: string;
  category: DealCategory;
  isPriceError: boolean;
  isStackingHack: boolean;
  isFeatured: boolean;
  socialPost: string;
};
