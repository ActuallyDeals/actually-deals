import { attachAffiliate } from "@/lib/affiliate";
import { buildSocialPost, buildStackingSteps } from "@/lib/copy-engine";
import { resolveDealImage } from "@/lib/images";
import type { Deal, DealComment, DealVote } from "@/lib/types";

const now = "2026-08-28T16:00:00.000Z";

function deal(partial: Omit<
  Deal,
  | "affiliateUrl"
  | "imageUrl"
  | "commentCount"
  | "status"
  | "isStackingHack"
  | "isFeatured"
  | "category"
  | "stackingSteps"
  | "socialPost"
  | "queueStage"
> & {
  affiliateUrl?: string;
  imageUrl?: string;
  commentCount?: number;
  status?: Deal["status"];
  queueStage?: Deal["queueStage"];
  isStackingHack?: boolean;
  isFeatured?: boolean;
  category?: Deal["category"];
  stackingSteps?: Deal["stackingSteps"];
  socialPost?: string | null;
}): Deal {
  const image = resolveDealImage({
    scrapedImageUrl: partial.scrapedImageUrl,
    merchant: partial.merchant,
    merchantProductId: partial.merchantProductId,
  });
  return {
    ...partial,
    affiliateUrl: partial.affiliateUrl ?? attachAffiliate(partial.sourceUrl, partial.merchant),
    imageUrl: partial.imageUrl ?? image.imageUrl,
    commentCount: partial.commentCount ?? 0,
    status: partial.status ?? "published",
    queueStage:
      partial.queueStage ?? (partial.status && partial.status !== "published" ? "draft" : null),
    isStackingHack: partial.isStackingHack ?? Boolean(partial.promoCode),
    isFeatured: partial.isFeatured ?? false,
    category:
      partial.category ??
      (partial.isPriceMistake ? "price-mistakes" : partial.merchant === "amazon" ? "amazon-finds" : "general"),
    stackingSteps:
      partial.stackingSteps ??
      buildStackingSteps({
        merchant: partial.merchant,
        promoCode: partial.promoCode,
        currentPrice: partial.currentPrice,
        sourceUrl: partial.sourceUrl,
      }),
    socialPost:
      partial.socialPost ??
      buildSocialPost({
        title: partial.title,
        merchant: partial.merchant,
        currentPrice: partial.currentPrice,
        why: partial.summary,
        slug: partial.slug,
        sourceUrl: partial.sourceUrl,
      }),
  };
}

export const SEED_DEALS: Deal[] = [
  deal({
    id: "11111111-1111-4111-8111-111111111111",
    slug: "amazon-instant-pot-duo-plus-price-mistake",
    title: "Price Mistake: Instant Pot Duo Plus 9-in-1 drops to $49",
    merchant: "amazon",
    merchantProductId: "B08PQ2KWHS",
    sourceUrl: "https://www.amazon.com/dp/B08PQ2KWHS",
    scrapedImageUrl: null,
    currentPrice: 49,
    listPrice: 129.99,
    promoCode: null,
    isPriceMistake: true,
    bullets: [
      "Amazon has this 6-quart Duo Plus ringing $49 instead of the usual $120–$130 we see on this exact SKU.",
      "Add to cart as a Prime member — the glitch price is applying at checkout, not just on the listing.",
      "Limit quantities. Price mistakes get pulled fast and multi-unit carts are the first ones cancelled.",
    ],
    summary: "Glitch pricing on a workhorse Instant Pot. Confirm the $49 total before you hit place order.",
    publishedAt: "2026-08-28T14:20:00.000Z",
    createdAt: "2026-08-28T14:10:00.000Z",
    updatedAt: now,
    aliveVotes: 18,
    expiredVotes: 3,
  }),
  deal({
    id: "22222222-2222-4222-8222-222222222222",
    slug: "walmart-red-bull-24-pack-warehouse-clearance",
    title: "Walmart: 24-pack Red Bull Sugar Free for $19.88",
    merchant: "walmart",
    merchantProductId: "14898365",
    sourceUrl: "https://www.walmart.com/ip/Red-Bull-Sugar-Free-Energy-Drink-8-4-fl-oz-24-pack/14898365",
    scrapedImageUrl: null,
    currentPrice: 19.88,
    listPrice: 43.92,
    promoCode: "ENERGY24",
    isPriceMistake: false,
    bullets: [
      "Warehouse clearance has the 24-pack at $19.88 — that’s about 83¢ a can versus ~$1.80 everyday.",
      "Apply ENERGY24 at checkout if the cart does not drop on its own. Store pickup is free.",
      "Stock is store-specific. If delivery is dry, switch the ZIP or flip to pickup.",
    ],
    summary: "A real warehouse dump, not a coupon stack. Grab it if your store still has cases.",
    publishedAt: "2026-08-28T13:05:00.000Z",
    createdAt: "2026-08-28T12:50:00.000Z",
    updatedAt: now,
    aliveVotes: 9,
    expiredVotes: 1,
  }),
  deal({
    id: "33333333-3333-4333-8333-333333333333",
    slug: "target-dyson-v8-circle-week",
    title: "Target Circle: Dyson V8 Absolute to $249",
    merchant: "target",
    merchantProductId: "54191097",
    sourceUrl: "https://www.target.com/p/dyson-v8-absolute-cordless-vacuum/-/A-54191097",
    scrapedImageUrl: null,
    currentPrice: 249,
    listPrice: 429.99,
    promoCode: "CIRCLE20",
    isPriceMistake: false,
    bullets: [
      "Circle Week is stacking 20% on an already-cut V8, landing at $249 after CIRCLE20.",
      "Toggle Circle at checkout and sign in. The code will not fire as a guest.",
      "This is a previous-gen V8, not the V15. Fine if you want cordless suction without the $500 tag.",
    ],
    summary: "Best V8 print we have logged this year. Confirm Circle is toggled before you pay.",
    publishedAt: "2026-08-27T18:40:00.000Z",
    createdAt: "2026-08-27T18:30:00.000Z",
    updatedAt: now,
    aliveVotes: 6,
    expiredVotes: 6,
  }),
  deal({
    id: "44444444-4444-4444-8444-444444444444",
    slug: "home-depot-dewalt-20v-combo-kit",
    title: "Home Depot: DeWalt 20V 4-tool combo at $149",
    merchant: "home-depot",
    merchantProductId: "304667167",
    sourceUrl: "https://www.homedepot.com/p/DEWALT-20V-MAX-Cordless-4-Tool-Combo-Kit/304667167",
    scrapedImageUrl: null,
    currentPrice: 149,
    listPrice: 299,
    promoCode: null,
    isPriceMistake: false,
    bullets: [
      "The 4-tool kit (drill, impact, light, charger, 2 batteries) is $149 after the instant markdown.",
      "Add to cart and choose free store pickup — online-only pricing, no rain checks in-aisle.",
      "Kit contents vary by store inventory. Open the “what’s included” row before you drive over.",
    ],
    summary: "A clean 50% off a starter DeWalt kit if you still need batteries in the 20V line.",
    publishedAt: "2026-08-27T15:10:00.000Z",
    createdAt: "2026-08-27T15:00:00.000Z",
    updatedAt: now,
    aliveVotes: 11,
    expiredVotes: 2,
  }),
  deal({
    id: "55555555-5555-4555-8555-555555555555",
    slug: "best-buy-sony-wh-1000xm5-open-box",
    title: "Best Buy open-box Sony WH-1000XM5 for $228",
    merchant: "best-buy",
    merchantProductId: "6505727",
    sourceUrl: "https://www.bestbuy.com/site/sony-wh-1000xm5/6505727.p?skuId=6505727",
    scrapedImageUrl: null,
    currentPrice: 228,
    listPrice: 399.99,
    promoCode: null,
    isPriceMistake: false,
    bullets: [
      "Excellent-condition open-box XM5s are $228 in a lot of zip codes — $170 under Sony’s current street.",
      "Set your store, filter condition to Excellent, and checkout for pickup. Shipping open-box is rarer.",
      "Open the condition notes. “Excellent” is usually missing only the extra cables, not the cups.",
    ],
    summary: "If your store still has Excellent stock, this is the XM5 price to beat.",
    publishedAt: "2026-08-26T21:15:00.000Z",
    createdAt: "2026-08-26T21:00:00.000Z",
    updatedAt: now,
    aliveVotes: 4,
    expiredVotes: 8,
  }),
  deal({
    id: "66666666-6666-4666-8666-666666666666",
    slug: "incoming-amazon-watch-list",
    title: "Incoming: Amazon listing parked from X",
    merchant: "amazon",
    merchantProductId: "B0BSHF7WHW",
    sourceUrl: "https://www.amazon.com/dp/B0BSHF7WHW",
    scrapedImageUrl: null,
    currentPrice: 0,
    listPrice: null,
    promoCode: null,
    isPriceMistake: false,
    bullets: ["Price not filled yet.", "Confirm shipping on the listing.", "Do not invent a price."],
    summary: "Parked for later. Fill price from the live listing before publish.",
    status: "draft",
    queueStage: "incoming",
    publishedAt: null,
    createdAt: "2026-08-31T12:00:00.000Z",
    updatedAt: now,
    aliveVotes: 0,
    expiredVotes: 0,
  }),
  deal({
    id: "77777777-7777-4777-8777-777777777777",
    slug: "draft-target-circle-watch",
    title: "Draft: Target Circle item — needs bullets",
    merchant: "target",
    merchantProductId: "54191097",
    sourceUrl: "https://www.target.com/p/dyson-v8-absolute-cordless-vacuum/-/A-54191097",
    scrapedImageUrl: null,
    currentPrice: 249,
    listPrice: 429.99,
    promoCode: "CIRCLE20",
    isPriceMistake: false,
    bullets: [
      "Circle price looks real at $249 after CIRCLE20.",
      "Confirm Circle is toggled at checkout.",
      "Rewrite these bullets before marking Ready.",
    ],
    summary: "Desk draft so Incoming / Drafts / Ready is visible on a fresh store.",
    status: "draft",
    queueStage: "draft",
    publishedAt: null,
    createdAt: "2026-08-31T12:10:00.000Z",
    updatedAt: now,
    aliveVotes: 0,
    expiredVotes: 0,
  }),
];

export const SEED_COMMENTS: DealComment[] = [
  {
    id: "c1111111-1111-4111-8111-111111111111",
    dealId: SEED_DEALS[0].id,
    authorName: "Priya",
    body: "Just checked out at $49.12 after tax. Instant Pot still showing the glitch on my end — went through on the second cart.",
    createdAt: "2026-08-28T14:41:00.000Z",
  },
  {
    id: "c1111111-1111-4111-8111-111111111112",
    dealId: SEED_DEALS[0].id,
    authorName: "Mark",
    body: "Worked in a fresh incognito window. Regular session still had $129 until I cleared cookies.",
    createdAt: "2026-08-28T15:02:00.000Z",
  },
  {
    id: "c2222222-2222-4222-8222-222222222221",
    dealId: SEED_DEALS[1].id,
    authorName: "Chris",
    body: "ENERGY24 took it to $19.88 in Austin. Delivery was out, pickup still had 7 cases.",
    createdAt: "2026-08-28T13:44:00.000Z",
  },
];

SEED_DEALS.forEach((item) => {
  item.commentCount = SEED_COMMENTS.filter((comment) => comment.dealId === item.id).length;
});

export const SEED_VOTES: DealVote[] = SEED_DEALS.flatMap((item) => {
  const votes: DealVote[] = [];
  for (let i = 0; i < item.aliveVotes; i += 1) {
    votes.push({
      id: `vote-alive-${item.id}-${i}`,
      dealId: item.id,
      voterKey: `seed-alive-${item.id}-${i}`,
      choice: "alive",
      createdAt: item.publishedAt ?? item.createdAt,
      updatedAt: item.updatedAt,
    });
  }
  for (let i = 0; i < item.expiredVotes; i += 1) {
    votes.push({
      id: `vote-expired-${item.id}-${i}`,
      dealId: item.id,
      voterKey: `seed-expired-${item.id}-${i}`,
      choice: "expired",
      createdAt: item.publishedAt ?? item.createdAt,
      updatedAt: item.updatedAt,
    });
  }
  return votes;
});
