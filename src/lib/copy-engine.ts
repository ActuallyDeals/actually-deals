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

function priceHeadline(title: string, merchant: Merchant, currentPrice: number): string {
  return `${formatUsd(currentPrice)} ${shortDealName(title)} at ${merchantLabel(merchant)}`;
}

function disclosureLine(merchant: Merchant): string {
  return merchant === "amazon" ? AMAZON_ASSOCIATE_DISCLOSURE : GENERIC_AFFILIATE_DISCLOSURE;
}

function longerCaptionBody(input: SocialComposeInput & { currentPrice: number }): string[] {
  const parts = [priceHeadline(input.title, input.merchant, input.currentPrice)];
  const why = input.why?.trim();
  if (why) parts.push("", why);
  const stack = input.stack?.trim();
  if (stack) parts.push("", "How it stacks:", stack);
  const verify = input.verify?.trim();
  if (verify) parts.push("", "Verify:", verify);
  return parts;
}

/** Original X draft from our fields only. Empty when there is no live price. Does not post. */
export function buildSocialPost(input: SocialComposeInput): string {
  if (!hasLivePrice(input.currentPrice)) return "";
  const headline = priceHeadline(input.title, input.merchant, input.currentPrice);
  const context = oneContextLine(input.why, input.stack);
  const url = publicDealUrl(input.slug);
  const parts = [headline];
  if (context) parts.push("", context);
  if (url) parts.push("", `${url} #ad`);
  else parts.push("", "#ad");
  const post = parts.join("\n");
  return post.length <= 280 ? post : `${post.slice(0, 277)}…`;
}

/** Slightly longer Instagram caption from our fields only. Does not post. */
export function buildInstagramCaption(input: SocialComposeInput): string {
  if (!hasLivePrice(input.currentPrice)) return "";
  const url = publicDealUrl(input.slug);
  const parts = [
    ...longerCaptionBody({ ...input, currentPrice: input.currentPrice }),
    "",
    disclosureLine(input.merchant),
    "",
    `@${SOCIAL.instagram.handle}`,
  ];
  if (url) parts.push("", url);
  return parts.join("\n");
}

/** Facebook draft from our fields only. Page name ActuallyDeals. Does not post. */
export function buildFacebookPost(input: SocialComposeInput): string {
  if (!hasLivePrice(input.currentPrice)) return "";
  const url = publicDealUrl(input.slug);
  const parts = [
    ...longerCaptionBody({ ...input, currentPrice: input.currentPrice }),
    "",
    disclosureLine(input.merchant),
    "",
    SOCIAL.facebook.handle,
  ];
  if (url) parts.push("", url);
  return parts.join("\n");
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
