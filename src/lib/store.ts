import { SEED_DEALS } from "@/data/seed-deals";
import { injectAffiliate } from "@/lib/affiliate";
import {
  buildBullets,
  buildHeadline,
  buildSocialPost,
  buildStackingSteps,
  slugify,
} from "@/lib/deal-ingest";
import { computeDiscountPercent, parseMoney } from "@/lib/money";
import type {
  Deal,
  DealComment,
  DealDraft,
  DealVote,
  FeedFilter,
} from "@/lib/types";

const DEALS_KEY = "actually-deals:deals:v1";
const COMMENTS_KEY = "actually-deals:comments:v1";
const VOTES_KEY = "actually-deals:votes:v1";
export const DEALS_EVENT = "actually-deals:changed";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!canUseStorage()) {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(DEALS_EVENT));
}

export function loadPublishedDeals(): Deal[] {
  return readJson<Deal[]>(DEALS_KEY, []);
}

export function getAllDeals(): Deal[] {
  const published = loadPublishedDeals();
  const publishedIds = new Set(published.map((deal) => deal.id));
  const publishedSlugs = new Set(published.map((deal) => deal.slug));
  const seeds = SEED_DEALS.filter(
    (deal) => !publishedIds.has(deal.id) && !publishedSlugs.has(deal.slug),
  );
  return [...published, ...seeds].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getDealBySlug(slug: string): Deal | undefined {
  return getAllDeals().find((deal) => deal.slug === slug);
}

export function filterDeals(
  deals: Deal[],
  options: { filter: FeedFilter; query: string },
): Deal[] {
  const query = options.query.trim().toLowerCase();

  return deals.filter((deal) => {
    if (deal.isExpired && options.filter !== "all") {
      // still searchable, but hide expired from specialized tabs
    }

    const matchesFilter =
      options.filter === "all" ||
      (options.filter === "price-errors" && deal.isPriceError) ||
      (options.filter === "coupon-stacks" && deal.isStackingHack) ||
      (options.filter === "amazon" &&
        (deal.merchantName.toLowerCase() === "amazon" ||
          deal.category === "amazon-finds"));

    if (!matchesFilter) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      deal.title,
      deal.merchantName,
      deal.category,
      deal.couponCode ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function draftToDeal(draft: DealDraft): Deal {
  const dealPrice = parseMoney(draft.dealPrice);
  const msrp = parseMoney(draft.msrp);
  const discountPercent = computeDiscountPercent(dealPrice, msrp);
  const slug = draft.slug || slugify(draft.title) || "new-deal";
  const now = new Date().toISOString();
  const title =
    draft.title.trim() ||
    buildHeadline({
      title: draft.title,
      dealPrice,
      msrp,
      discountPercent,
    });

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `deal-${Date.now()}`,
    title,
    slug,
    merchantId: null,
    merchantName: draft.merchantName.trim() || "Merchant",
    dealUrl: draft.dealUrl.trim(),
    affiliateUrl: injectAffiliate(draft.dealUrl.trim()),
    imageUrl:
      draft.imageUrl.trim() ||
      `data:image/svg+xml;charset=UTF-8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg'/>")}`,
    dealPrice,
    msrp,
    discountPercent,
    couponCode: draft.couponCode.trim() || null,
    bullets: buildBullets({
      merchantName: draft.merchantName.trim() || "Merchant",
      dealPrice,
      msrp,
      discountPercent,
      couponCode: draft.couponCode.trim() || null,
    }),
    stackingSteps: buildStackingSteps({
      merchantName: draft.merchantName.trim() || "Merchant",
      couponCode: draft.couponCode.trim() || null,
      dealPrice,
    }),
    category: draft.category,
    isPriceError: draft.isPriceError,
    isStackingHack: draft.isStackingHack,
    isFeatured: draft.isFeatured,
    isExpired: false,
    upvotes: 0,
    downvotes: 0,
    clickCount: 0,
    postedBy: "admin",
    createdAt: now,
    updatedAt: now,
  };
}

function uniqueSlug(base: string): string {
  const existing = new Set(getAllDeals().map((deal) => deal.slug));
  if (!existing.has(base)) {
    return base;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

export function publishDeal(deal: Deal): Deal {
  const next = { ...deal, slug: uniqueSlug(deal.slug) };
  const existing = loadPublishedDeals().filter(
    (item) => item.id !== next.id && item.slug !== next.slug,
  );
  writeJson(DEALS_KEY, [next, ...existing]);
  return next;
}

export function incrementClicks(dealId: string) {
  const published = loadPublishedDeals();
  const index = published.findIndex((deal) => deal.id === dealId);
  if (index === -1) {
    return;
  }
  const current = published[index];
  if (!current) {
    return;
  }
  published[index] = {
    ...current,
    clickCount: current.clickCount + 1,
    updatedAt: new Date().toISOString(),
  };
  writeJson(DEALS_KEY, published);
}

export function loadComments(dealId: string): DealComment[] {
  const all = readJson<DealComment[]>(COMMENTS_KEY, []);
  return all
    .filter((comment) => comment.dealId === dealId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function addComment(
  dealId: string,
  authorName: string,
  content: string,
): DealComment {
  const comment: DealComment = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `comment-${Date.now()}`,
    dealId,
    authorName: authorName.trim() || "Deal Hunter",
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };
  writeJson(COMMENTS_KEY, [comment, ...readJson<DealComment[]>(COMMENTS_KEY, [])]);
  return comment;
}

export function loadVote(dealId: string): DealVote | null {
  const all = readJson<Record<string, DealVote>>(VOTES_KEY, {});
  return all[dealId] ?? null;
}

export function saveVote(
  deal: Deal,
  isAlive: boolean,
): { deal: Deal; vote: DealVote } {
  const previous = loadVote(deal.id);
  let upvotes = deal.upvotes;
  let downvotes = deal.downvotes;

  if (previous?.isAlive === isAlive) {
    return { deal, vote: previous };
  }

  if (previous) {
    if (previous.isAlive) {
      upvotes = Math.max(0, upvotes - 1);
    } else {
      downvotes = Math.max(0, downvotes - 1);
    }
  }

  if (isAlive) {
    upvotes += 1;
  } else {
    downvotes += 1;
  }

  const total = upvotes + downvotes;
  const expiredShare = total > 0 ? downvotes / total : 0;
  const nextDeal: Deal = {
    ...deal,
    upvotes,
    downvotes,
    isExpired: expiredShare > 0.7,
    updatedAt: new Date().toISOString(),
  };

  const published = loadPublishedDeals();
  const index = published.findIndex((item) => item.id === deal.id);
  if (index >= 0) {
    published[index] = nextDeal;
    writeJson(DEALS_KEY, published);
  } else {
    writeJson(DEALS_KEY, [nextDeal, ...published]);
  }

  const votes = readJson<Record<string, DealVote>>(VOTES_KEY, {});
  const vote = { dealId: deal.id, isAlive };
  votes[deal.id] = vote;
  writeJson(VOTES_KEY, votes);

  return { deal: nextDeal, vote };
}

export function emptyDraft(): DealDraft {
  return {
    title: "",
    slug: "",
    merchantName: "",
    dealUrl: "",
    imageUrl: "",
    dealPrice: "",
    msrp: "",
    couponCode: "",
    category: "general",
    isPriceError: false,
    isStackingHack: false,
    isFeatured: false,
    socialPost: "",
  };
}

export function socialFromDraft(draft: DealDraft): string {
  return buildSocialPost({
    title: draft.title || "This deal",
    dealPrice: parseMoney(draft.dealPrice),
    msrp: parseMoney(draft.msrp),
    slug: draft.slug || slugify(draft.title) || "new-deal",
    couponCode: draft.couponCode || null,
  });
}
