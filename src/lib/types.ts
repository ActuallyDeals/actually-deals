export const MERCHANTS = [
  "amazon",
  "walmart",
  "target",
  "home-depot",
  "best-buy",
  "costco",
  "newegg",
  "ebay",
  "kohls",
  "dicks",
  "office-depot",
  "uber",
  "doordash",
  "grubhub",
  "other",
] as const;

export type Merchant = (typeof MERCHANTS)[number];

export const DEAL_STATUSES = ["draft", "published", "expired"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const QUEUE_STAGES = ["incoming", "draft", "ready"] as const;
export type QueueStage = (typeof QUEUE_STAGES)[number];

export const VOTE_CHOICES = ["alive", "expired"] as const;
export type VoteChoice = (typeof VOTE_CHOICES)[number];

export const DEAL_CATEGORIES = [
  "amazon-finds",
  "tech",
  "home",
  "apparel",
  "price-mistakes",
  "freebies",
  "general",
] as const;
export type DealCategory = (typeof DEAL_CATEGORIES)[number];

export const FEED_FILTERS = ["all", "price-mistakes", "coupons", "amazon"] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

export interface StackingStep {
  step: number;
  title: string;
  detail: string;
}

export interface Deal {
  id: string;
  slug: string;
  title: string;
  merchant: Merchant;
  merchantProductId: string | null;
  sourceUrl: string;
  affiliateUrl: string;
  scrapedImageUrl: string | null;
  imageUrl: string;
  currentPrice: number;
  listPrice: number | null;
  promoCode: string | null;
  isPriceMistake: boolean;
  isStackingHack: boolean;
  isFeatured: boolean;
  category: DealCategory;
  bullets: string[];
  stackingSteps: StackingStep[];
  socialPost: string | null;
  summary: string | null;
  status: DealStatus;
  /** Staff desk only. Null once the deal is on the public feed. */
  queueStage: QueueStage | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  aliveVotes: number;
  expiredVotes: number;
  commentCount: number;
}

export interface DealComment {
  id: string;
  dealId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface DealVote {
  id: string;
  dealId: string;
  voterKey: string;
  choice: VoteChoice;
  createdAt: string;
  updatedAt: string;
}

export interface ParsedDeal {
  merchant: Merchant;
  merchantProductId: string | null;
  sourceUrl: string;
  affiliateUrl: string;
  title: string;
  currentPrice: number | null;
  listPrice: number | null;
  scrapedImageUrl: string | null;
  imageUrl: string;
  imageTier: "scraped" | "cdn" | "placeholder";
  bullets: string[];
  stackingSteps: StackingStep[];
  socialPost: string;
  pricesBlocked: boolean;
  scrapeNote: string | null;
  promoCode?: string | null;
  clipCoupon?: boolean;
  subscribeSave?: boolean;
  summary?: string | null;
}

export interface PublishDealInput {
  title: string;
  merchant: Merchant;
  merchantProductId?: string | null;
  sourceUrl: string;
  affiliateUrl?: string;
  scrapedImageUrl?: string | null;
  imageUrl?: string;
  currentPrice?: number | null;
  listPrice?: number | null;
  promoCode?: string | null;
  isPriceMistake?: boolean;
  isStackingHack?: boolean;
  isFeatured?: boolean;
  category?: DealCategory;
  bullets: string[];
  stackingSteps?: StackingStep[];
  socialPost?: string | null;
  summary?: string | null;
  status?: DealStatus;
  queueStage?: QueueStage | null;
}

export function isCommunityExpired(deal: Deal): boolean {
  const total = deal.aliveVotes + deal.expiredVotes;
  return total > 0 && deal.expiredVotes / total > 0.7;
}

export function isDeadListing(deal: Deal): boolean {
  return deal.status === "expired" || isCommunityExpired(deal);
}

export function percentOff(deal: Pick<Deal, "currentPrice" | "listPrice">): number | null {
  if (!deal.listPrice || deal.listPrice <= deal.currentPrice) return null;
  return Math.round(((deal.listPrice - deal.currentPrice) / deal.listPrice) * 100);
}
