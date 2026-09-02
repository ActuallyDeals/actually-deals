import { AMAZON_ASSOCIATE_DISCLOSURE, GENERIC_AFFILIATE_DISCLOSURE } from "@/lib/disclosures";
import { formatUsd } from "@/lib/format";
import { merchantLabel } from "@/lib/merchants";
import { isAppCouponDeal } from "@/lib/outbound";
import { SOCIAL } from "@/lib/social";
import type { Merchant, StackingStep } from "@/lib/types";

export function buildDanHeadline(input: {
  title: string;
  merchant: Merchant;
  currentPrice: number | null;
  listPrice: number | null;
  promoCode?: string | null;
}): string {
  const name = input.title.trim() || "This item";
  const store = merchantLabel(input.merchant);
  const code = input.promoCode ? " w/ Code" : "";
  if (input.currentPrice != null && input.listPrice != null) {
    return `${name} Only ${formatUsd(input.currentPrice)} at ${store} (Reg. ${formatUsd(input.listPrice)})${code}`;
  }
  if (input.currentPrice != null) {
    return `${name} Only ${formatUsd(input.currentPrice)} at ${store}${code}`;
  }
  return `${name}${code}`;
}

export function buildDanBullets(input: {
  merchant: Merchant;
  currentPrice: number | null;
  listPrice: number | null;
  percentOff: number | null;
  promoCode: string | null;
  sourceUrl?: string | null;
}): string[] {
  const store = merchantLabel(input.merchant);
  const price = input.currentPrice != null ? formatUsd(input.currentPrice) : null;
  const list = input.listPrice != null ? formatUsd(input.listPrice) : null;
  const code = input.promoCode?.trim() || "";

  if (
    isAppCouponDeal({
      merchant: input.merchant,
      promoCode: input.promoCode,
      sourceUrl: input.sourceUrl,
    })
  ) {
    const withCode = code ? ` with code ${code}` : "";
    const priceText =
      price && list
        ? `${price} off ${list} at ${store}${withCode}. Confirm it still works in the app.`
        : price && code
          ? `${price} at ${store} with code ${code}. Confirm it still works in the app.`
          : price
            ? `${price} at ${store}. Confirm the total in the app.`
            : code
              ? `Code ${code} at ${store}. Confirm it still works in the app.`
              : `See the live offer in the ${store} app. Do not guess from memory.`;
    const feesText = "Fees, minimums, and other terms show in the app. Check them before you pay.";
    const actionText = code
      ? `Enter ${code} in the app at checkout, then confirm the discount took.`
      : "Add the code at checkout in the app, then confirm the discount took.";
    return [priceText, feesText, actionText];
  }

  const priceText =
    price && list && input.percentOff
      ? `${price} (was ${list}) · ${input.percentOff}% off recent street.`
      : price
        ? `${price} at ${store}. Confirm the total at checkout.`
        : `See the live price at ${store}. Do not guess from memory.`;

  const shippingText =
    input.merchant === "amazon"
      ? "Free Prime shipping on eligible orders; otherwise check the threshold."
      : `Check shipping or free store pickup at ${store}.`;

  const actionText = input.promoCode
    ? `Apply code ${input.promoCode} at checkout, then confirm the total.`
    : `Confirm the live total at ${store} before you pay.`;

  return [priceText, shippingText, actionText];
}

export function buildStackingSteps(input: {
  merchant: Merchant;
  promoCode: string | null;
  currentPrice: number | null;
  sourceUrl?: string | null;
}): StackingStep[] {
  const store = merchantLabel(input.merchant);
  const price = input.currentPrice != null ? formatUsd(input.currentPrice) : null;
  const code = input.promoCode?.trim() || "";

  if (
    isAppCouponDeal({
      merchant: input.merchant,
      promoCode: input.promoCode,
      sourceUrl: input.sourceUrl,
    })
  ) {
    return [
      {
        step: 1,
        title: `Open the ${store} app`,
        detail: `Open the ${store} app and start your order.`,
      },
      {
        step: 2,
        title: code ? `Enter ${code}` : "Add the code at checkout",
        detail: code
          ? `Enter ${code} in the promo field before you pay.`
          : "Add the code at checkout if you have one.",
      },
      {
        step: 3,
        title: "Confirm the discount",
        detail: "Confirm the discount and the total before you pay.",
      },
    ];
  }

  return [
    {
      step: 1,
      title: `Open the ${store} listing`,
      detail: "Use Get Deal so you land on the cleaned product page.",
    },
    {
      step: 2,
      title: input.promoCode ? `Enter ${input.promoCode}` : "Confirm the live total",
      detail: input.promoCode
        ? `Add the item, then apply ${input.promoCode} before you pay.`
        : `Confirm the live total at ${store} before you pay.`,
    },
    {
      step: 3,
      title: price ? `Confirm ${price} at checkout` : "Confirm the live checkout price",
      detail: "If the total does not match, vote Expired.",
    },
  ];
}

export type DealMechanics = {
  promoCode: string | null;
  clipCoupon: boolean;
  subscribeSave: boolean;
  membership: string | null;
  giftCard: boolean;
  freeShipping: boolean;
  pickup: boolean;
  firstTime: boolean;
  mustUseLink: boolean;
  addThenApply: boolean;
  quantityLimit: string | null;
  extraDeliveryFee: { label: string; amount: number | null } | null;
};

export function hasExtraMechanics(mechanics: DealMechanics): boolean {
  return Boolean(
    mechanics.promoCode ||
      mechanics.clipCoupon ||
      mechanics.subscribeSave ||
      mechanics.membership ||
      mechanics.giftCard ||
      mechanics.freeShipping ||
      mechanics.pickup ||
      mechanics.firstTime ||
      mechanics.mustUseLink ||
      mechanics.addThenApply ||
      mechanics.quantityLimit ||
      mechanics.extraDeliveryFee,
  );
}

function emptyMechanics(): DealMechanics {
  return {
    promoCode: null,
    clipCoupon: false,
    subscribeSave: false,
    membership: null,
    giftCard: false,
    freeShipping: false,
    pickup: false,
    firstTime: false,
    mustUseLink: false,
    addThenApply: false,
    quantityLimit: null,
    extraDeliveryFee: null,
  };
}

/** Facts from original-post text. Does not copy voice or chrome. */
export function extractDealMechanics(text: string): DealMechanics {
  const mechanics = emptyMechanics();
  const raw = text.replace(/\s+/g, " ").trim();
  if (!raw) return mechanics;
  const lower = raw.toLowerCase();

  const codeMatch = raw.match(
    /\b(?:use |enter |apply )?(?:promo(?:tion)? code|coupon code|code)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})\b/i,
  );
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase();
    if (!/^(ZIP|AREA|POSTAL|HTML|HTTP|HTTPS|DEAL)$/.test(code)) mechanics.promoCode = code;
  }

  mechanics.clipCoupon =
    /clip(?:ping)?(?:\s+the)?\s+coupon|\bamazon coupon\b|\bac\b|% off coupon|\bclip\s+\d+\s*%/.test(lower);
  mechanics.subscribeSave = /subscribe\s*(?:&|and)?\s*save|\bsns\b|\bs&s\b/.test(lower);

  const membershipMatch = raw.match(
    /\b(costco(?:\s+membership)?|ashley advantage|walmart\+|sam(?:'s)? club|bj'?s(?:\s+membership)?|prime membership)\b/i,
  );
  if (membershipMatch && /member|membership|advantage|walmart\+|qualify/i.test(lower)) {
    mechanics.membership = membershipMatch[1].replace(/\s+/g, " ").trim();
  } else if (/\b(costco membership|ashley advantage|walmart\+)\b/i.test(lower)) {
    mechanics.membership = (lower.match(/costco membership|ashley advantage|walmart\+/) || [null])[0];
  }

  mechanics.giftCard = /\bgift\s*cards?\b|\bstore credit\b/.test(lower);
  mechanics.freeShipping =
    /doorstep\s+delivery\s+is\s+free|\bfree\s+(?:prime\s+)?(?:doorstep\s+)?(?:delivery|shipping)\b/.test(lower);
  mechanics.pickup = /\b(?:store\s+)?pickup\b|\bpick\s*up\b|\bship to store\b/.test(lower);
  mechanics.firstTime = /\bfirst[- ]time\b|\bnew customers? only\b|\bnew[- ]customer\b/.test(lower);
  mechanics.mustUseLink = /\bmust use (?:this|the) link\b|\buse this link\b/.test(lower);
  mechanics.addThenApply =
    /\badd(?: it| the item)?(?: to (?:your )?cart)? then (?:apply|enter|clip)\b|\badd to cart,? then apply\b/.test(
      lower,
    );

  const qty = raw.match(
    /\b(?:limit(?:ed)?(?: to| of)?|max(?:imum)?)\s+(\d+)\s*(?:per\s+)?(customer|household|order|person)?/i,
  );
  if (qty) {
    mechanics.quantityLimit = qty[2] ? `${qty[1]} per ${qty[2].toLowerCase()}` : qty[1];
  }

  const extra = raw.match(
    /\b((?:white\s*glove|premium|express|expedited)(?:\s+delivery)?)\s+(?:adds?|is|for)\s+\$([0-9][0-9,]*(?:\.[0-9]{1,2})?)/i,
  );
  if (extra) {
    const amount = Number.parseFloat(extra[2].replace(/,/g, ""));
    mechanics.extraDeliveryFee = {
      label: extra[1].replace(/\s+/g, " ").trim().replace(/^\w/, (c) => c.toUpperCase()),
      amount: Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null,
    };
  }

  return mechanics;
}

function deliveryBullet(mechanics: DealMechanics, store: string, merchant: Merchant): string {
  const extra = mechanics.extraDeliveryFee;
  const extraText =
    extra && extra.amount != null
      ? `${extra.label} adds ${formatUsd(extra.amount)}`
      : extra
        ? `${extra.label} costs extra`
        : null;
  if (mechanics.freeShipping && extraText) {
    return `Doorstep delivery is free. ${extraText} — confirm which one is on the order.`;
  }
  if (mechanics.freeShipping && mechanics.pickup) {
    return `Free shipping or delivery if it still qualifies. Pickup is an option too — check the listing.`;
  }
  if (mechanics.freeShipping) {
    return "Free shipping or doorstep delivery if the listing still shows it. Confirm before you pay.";
  }
  if (extraText && mechanics.pickup) {
    return `${extraText}. Pickup vs shipping is on the listing — check it.`;
  }
  if (extraText) return `${extraText}. Confirm delivery on the listing before you pay.`;
  if (mechanics.pickup) return `Check store pickup vs shipping at ${store}.`;
  if (merchant === "amazon") return "Free Prime shipping on eligible orders; otherwise check the threshold.";
  return `Check shipping or free store pickup at ${store}.`;
}

function mechanicActionBullet(mechanics: DealMechanics, store: string): string {
  const code = mechanics.promoCode;
  const bits: string[] = [];
  if (mechanics.clipCoupon && mechanics.subscribeSave) {
    bits.push("Clip the on-page coupon, then turn on Subscribe & Save.");
  } else if (mechanics.clipCoupon) {
    bits.push("Clip the on-page coupon before you check out.");
  } else if (mechanics.subscribeSave) {
    bits.push("Turn on Subscribe & Save on this listing. You can cancel after it ships.");
  }
  if (code) bits.push(`Apply code ${code} at checkout, then confirm the total.`);
  if (mechanics.addThenApply && !code) bits.push("Add the item, then apply the coupon or code before you pay.");
  if (mechanics.giftCard) bits.push("Apply any store gift card or credit at checkout, then confirm the stacked total.");
  if (mechanics.membership) {
    bits.push(`This looks like a ${mechanics.membership} price. Confirm you can check out with that membership.`);
  }
  if (mechanics.firstTime) bits.push("This looks limited to first-time / new customers. Confirm you qualify.");
  if (mechanics.quantityLimit) bits.push(`Limit ${mechanics.quantityLimit}. Don't assume you can grab extras.`);
  if (mechanics.mustUseLink) bits.push("Use Get Deal so you land on the right listing.");
  if (bits.length) return bits.join(" ");
  return `Confirm the live total at ${store} before you pay.`;
}

/** Original stacking bullets from extracted facts. Same voice as buildDanBullets. */
export function buildMechanicsBullets(input: {
  merchant: Merchant;
  currentPrice: number | null;
  listPrice: number | null;
  percentOff: number | null;
  mechanics: DealMechanics;
}): string[] {
  const store = merchantLabel(input.merchant);
  const price = input.currentPrice != null ? formatUsd(input.currentPrice) : null;
  const list = input.listPrice != null ? formatUsd(input.listPrice) : null;
  const priceText =
    price && list && input.percentOff
      ? `${price} (was ${list}) · ${input.percentOff}% off recent street.`
      : price
        ? `${price} at ${store}. Confirm the total at checkout.`
        : `See the live price at ${store}. Do not guess from memory.`;
  return [priceText, deliveryBullet(input.mechanics, store, input.merchant), mechanicActionBullet(input.mechanics, store)].slice(
    0,
    3,
  );
}

export function buildMechanicsSteps(input: {
  merchant: Merchant;
  currentPrice: number | null;
  mechanics: DealMechanics;
}): StackingStep[] {
  const store = merchantLabel(input.merchant);
  const price = input.currentPrice != null ? formatUsd(input.currentPrice) : null;
  const code = input.mechanics.promoCode;
  const extra = input.mechanics.extraDeliveryFee;
  const steps: StackingStep[] = [
    {
      step: 1,
      title: `Open the ${store} listing`,
      detail: input.mechanics.mustUseLink
        ? "Use Get Deal so you land on the right listing."
        : "Use Get Deal so you land on the cleaned product page.",
    },
  ];

  const midBits: string[] = [];
  let midTitle = "Confirm the live total";
  if (input.mechanics.clipCoupon && input.mechanics.subscribeSave) {
    midTitle = "Clip coupon + Subscribe & Save";
    midBits.push("Clip the on-page coupon, then turn on Subscribe & Save.");
  } else if (input.mechanics.clipCoupon) {
    midTitle = "Clip the coupon";
    midBits.push("Clip the on-page coupon before you check out.");
  } else if (input.mechanics.subscribeSave) {
    midTitle = "Turn on Subscribe & Save";
    midBits.push("Turn on Subscribe & Save. You can cancel after it ships.");
  }
  if (code) {
    midTitle = `Enter ${code}`;
    midBits.push(`Add the item, then apply ${code} before you pay.`);
  } else if (input.mechanics.addThenApply) {
    midTitle = "Add, then apply";
    midBits.push("Add the item, then apply the coupon or code before you pay.");
  }
  if (input.mechanics.freeShipping && extra?.amount != null) {
    if (midTitle === "Confirm the live total") midTitle = "Check delivery";
    midBits.push(
      `Doorstep delivery is free. ${extra.label} adds ${formatUsd(extra.amount)}. Confirm which one you want.`,
    );
  } else if (input.mechanics.freeShipping) {
    if (midTitle === "Confirm the live total") midTitle = "Check delivery";
    midBits.push("Free shipping or doorstep delivery if the listing still shows it.");
  } else if (extra?.amount != null) {
    if (midTitle === "Confirm the live total") midTitle = "Check delivery";
    midBits.push(`${extra.label} adds ${formatUsd(extra.amount)}. Confirm delivery on the listing.`);
  }
  if (input.mechanics.pickup) midBits.push("Check store pickup vs shipping on the listing.");
  if (input.mechanics.giftCard) midBits.push("Apply gift card or store credit at checkout, then confirm the stacked total.");
  if (input.mechanics.membership) {
    midBits.push(`Confirm the ${input.mechanics.membership} membership still applies at checkout.`);
  }
  if (input.mechanics.firstTime) midBits.push("Confirm you qualify if this is first-time / new-customer only.");
  if (input.mechanics.quantityLimit) midBits.push(`Limit ${input.mechanics.quantityLimit}.`);

  steps.push({
    step: 2,
    title: midTitle,
    detail: midBits.join(" ") || `Confirm the live total at ${store} before you pay.`,
  });
  steps.push({
    step: 3,
    title: price ? `Confirm ${price} at checkout` : "Confirm the live checkout price",
    detail: "If the total does not match, vote Expired.",
  });
  return steps;
}

export function buildMechanicsWhy(input: {
  merchant: Merchant;
  currentPrice: number | null;
  mechanics: DealMechanics;
}): string | null {
  if (!hasExtraMechanics(input.mechanics)) return null;
  const store = merchantLabel(input.merchant);
  const price = input.currentPrice != null ? formatUsd(input.currentPrice) : null;
  const extra = input.mechanics.extraDeliveryFee;
  const bits: string[] = [];
  if (input.mechanics.freeShipping && extra?.amount != null) {
    bits.push(
      `Doorstep delivery is free. ${extra.label} adds ${formatUsd(extra.amount)}.`,
    );
  } else if (input.mechanics.freeShipping) {
    bits.push("Shipping or doorstep delivery is free if the listing still shows it.");
  } else if (extra?.amount != null) {
    bits.push(`${extra.label} adds ${formatUsd(extra.amount)}.`);
  }
  if (input.mechanics.clipCoupon && input.mechanics.subscribeSave) {
    bits.push("Clip the coupon and turn on Subscribe & Save.");
  } else if (input.mechanics.clipCoupon) {
    bits.push("Clip the on-page coupon.");
  } else if (input.mechanics.subscribeSave) {
    bits.push("Turn on Subscribe & Save.");
  }
  if (input.mechanics.promoCode) bits.push(`Use code ${input.mechanics.promoCode}.`);
  if (input.mechanics.giftCard) bits.push("Stack gift card or store credit if you have one.");
  if (input.mechanics.membership) bits.push(`${input.mechanics.membership} price — confirm you qualify.`);
  if (input.mechanics.firstTime) bits.push("First-time / new-customer only.");
  if (input.mechanics.quantityLimit) bits.push(`Limit ${input.mechanics.quantityLimit}.`);
  if (input.mechanics.pickup && !input.mechanics.freeShipping) bits.push("Pickup vs shipping is on the listing.");
  if (!bits.length) return null;
  bits.push(price ? `Confirm ${price} still rings up at ${store}.` : `Confirm the live total at ${store}.`);
  return bits.join(" ");
}

function shortDealName(title: string): string {
  let name = title.trim();
  name = name.replace(
    /^(price mistake|coupon stack|walmart|target|amazon|home depot|best buy|circle|uber|doordash|grubhub|postmates)[:\-–]\s*/i,
    "",
  );
  name = name.replace(/\s*(drops? to|for only|only|for|at)\s+\$[\d,.]+.*$/i, "");
  name = name.replace(/\$[\d,.]+/g, "").replace(/\s+/g, " ").trim();
  const words = name.split(/\s+/).filter(Boolean);
  return words.slice(0, 6).join(" ") || "This item";
}

function oneContextLine(why?: string | null, stack?: string | null): string {
  const raw = (why?.trim() || stack?.trim() || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return "";
  const sentence = raw.split(/(?<=[.!?])\s+/)[0] ?? raw;
  if (sentence.length <= 140) return sentence;
  const cut = sentence.slice(0, 137);
  const space = cut.lastIndexOf(" ");
  return `${(space > 80 ? cut.slice(0, space) : cut).trim()}…`;
}

function publicDealUrl(slug?: string | null): string | null {
  if (!slug || slug === "preview" || slug === "new-deal") return null;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://actuallydeals.com").replace(/\/$/, "");
  return `${site}/deal/${slug}`;
}

type SocialComposeInput = {
  title: string;
  merchant: Merchant;
  currentPrice: number | null;
  promoCode?: string | null;
  why?: string | null;
  stack?: string | null;
  verify?: string | null;
  slug?: string | null;
};

export type SocialDrafts = {
  x: string;
  instagram: string;
  facebook: string;
};

function hasLivePrice(price: number | null): price is number {
  return price != null && Number.isFinite(price) && price >= 0;
}

function canWriteCouponSocial(input: SocialComposeInput): boolean {
  if (input.promoCode?.trim()) return true;
  return isAppCouponDeal({ merchant: input.merchant, promoCode: input.promoCode });
}

function couponDealName(title: string): string {
  return title.trim() || "This deal";
}

function couponHeadline(title: string, merchant: Merchant, promoCode?: string | null): string {
  const name = couponDealName(title);
  const store = merchantLabel(merchant);
  const code = promoCode?.trim();
  return code ? `${name} at ${store} w/ code ${code}` : `${name} at ${store}`;
}

function priceHeadline(title: string, merchant: Merchant, currentPrice: number): string {
  return `${formatUsd(currentPrice)} ${shortDealName(title)} at ${merchantLabel(merchant)}`;
}

function disclosureLine(merchant: Merchant): string {
  return merchant === "amazon" ? AMAZON_ASSOCIATE_DISCLOSURE : GENERIC_AFFILIATE_DISCLOSURE;
}

function clipTweet(parts: string[]): string {
  const post = parts.join("\n");
  return post.length <= 280 ? post : `${post.slice(0, 277)}…`;
}

function xPostFromHeadline(headline: string, input: SocialComposeInput, withContext: boolean): string {
  const url = publicDealUrl(input.slug);
  const parts = [headline];
  if (withContext) {
    const context = oneContextLine(input.why, input.stack);
    if (context) parts.push("", context);
  }
  if (url) parts.push("", `${url} #ad`);
  else parts.push("", "#ad");
  return clipTweet(parts);
}

function couponCaptionParts(input: SocialComposeInput, handle: string, urlEarly = false): string {
  const url = publicDealUrl(input.slug);
  const parts = [couponHeadline(input.title, input.merchant, input.promoCode)];
  if (urlEarly && url) parts.push("", url);
  parts.push("", disclosureLine(input.merchant), "", handle);
  if (!urlEarly && url) parts.push("", url);
  return parts.join("\n");
}

/** Original X draft from our fields only. Empty when there is no live price and no coupon/app deal. Does not post. */
export function buildSocialPost(input: SocialComposeInput): string {
  if (hasLivePrice(input.currentPrice)) {
    return xPostFromHeadline(priceHeadline(input.title, input.merchant, input.currentPrice), input, true);
  }
  if (canWriteCouponSocial(input)) {
    return xPostFromHeadline(couponHeadline(input.title, input.merchant, input.promoCode), input, false);
  }
  return "";
}

/** Photo-first Instagram caption: deal on line one, one why line, disclosure, handle, URL. Does not post. */
export function buildInstagramCaption(input: SocialComposeInput): string {
  if (hasLivePrice(input.currentPrice)) {
    const url = publicDealUrl(input.slug);
    const parts = [priceHeadline(input.title, input.merchant, input.currentPrice)];
    const context = oneContextLine(input.why, input.stack);
    if (context) parts.push("", context);
    parts.push("", disclosureLine(input.merchant), "", `@${SOCIAL.instagram.handle}`);
    if (url) parts.push("", url);
    return parts.join("\n");
  }
  if (canWriteCouponSocial(input)) {
    return couponCaptionParts(input, `@${SOCIAL.instagram.handle}`);
  }
  return "";
}

/** Facebook draft: deal first, our deal URL next so the preview works. Page name ActuallyDeals. Does not post. */
export function buildFacebookPost(input: SocialComposeInput): string {
  if (hasLivePrice(input.currentPrice)) {
    const url = publicDealUrl(input.slug);
    const parts = [priceHeadline(input.title, input.merchant, input.currentPrice)];
    if (url) parts.push("", url);
    const why = input.why?.trim();
    if (why) parts.push("", why);
    parts.push("", disclosureLine(input.merchant), "", SOCIAL.facebook.handle);
    return parts.join("\n");
  }
  if (canWriteCouponSocial(input)) {
    return couponCaptionParts(input, SOCIAL.facebook.handle, true);
  }
  return "";
}

export function composeSocialDrafts(input: SocialComposeInput): SocialDrafts {
  return {
    x: buildSocialPost(input),
    instagram: buildInstagramCaption(input),
    facebook: buildFacebookPost(input),
  };
}

/** Plain X text stays as-is. A JSON bundle holds X + Instagram + Facebook on the existing socialPost field. */
export function parseSocialDrafts(raw: string | null | undefined): SocialDrafts {
  const text = raw?.trim() ?? "";
  if (text.startsWith("{")) {
    try {
      const parsed = JSON.parse(text) as Partial<SocialDrafts>;
      if (
        parsed &&
        typeof parsed === "object" &&
        (typeof parsed.x === "string" ||
          typeof parsed.instagram === "string" ||
          typeof parsed.facebook === "string")
      ) {
        return {
          x: typeof parsed.x === "string" ? parsed.x : "",
          instagram: typeof parsed.instagram === "string" ? parsed.instagram : "",
          facebook: typeof parsed.facebook === "string" ? parsed.facebook : "",
        };
      }
    } catch {
      // leftover plain draft
    }
  }
  return { x: raw ?? "", instagram: "", facebook: "" };
}

export function serializeSocialDrafts(drafts: SocialDrafts): string {
  if (!drafts.instagram.trim() && !drafts.facebook.trim()) return drafts.x;
  return JSON.stringify({
    x: drafts.x,
    instagram: drafts.instagram,
    facebook: drafts.facebook,
  });
}

export function discountPercent(current: number | null, list: number | null): number | null {
  if (current == null || list == null || list <= current) return null;
  return Math.round(((list - current) / list) * 100);
}
