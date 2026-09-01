import { formatUsd } from "@/lib/format";
import { merchantLabel } from "@/lib/merchants";
import type { Merchant } from "@/lib/types";

const TITLE_PREFIX = /^(?:\[[^\]]+\]\s*)?\$[\d,.]+?\*?\s*\|\s*/i;

export function stackTags(clipCoupon: boolean, subscribeSave: boolean, promoCode: string): string[] {
  const tags: string[] = [];
  if (subscribeSave) tags.push("SnS");
  if (clipCoupon) tags.push("AC");
  if (promoCode.trim()) tags.push("Code");
  return tags;
}

export function productNameFromTitle(title: string): string {
  return title.replace(TITLE_PREFIX, "").replace(/\s+at (?:Amazon|Walmart|Target|Home Depot|Best Buy)$/i, "").trim() || title.trim();
}

export function inferStackFromTitle(title: string): { clipCoupon: boolean; subscribeSave: boolean } {
  const bracket = title.match(/^\[([^\]]+)\]/);
  const blob = (bracket?.[1] ?? title).toLowerCase();
  return {
    clipCoupon: /\bac\b|coupon/.test(blob),
    subscribeSave: /\bsns\b|s&s|subscribe/.test(blob),
  };
}

function money(value: number): string {
  return formatUsd(value);
}

export function stackedHeadline(input: {
  title: string;
  merchant: Merchant;
  currentPrice: number | null;
  clipCoupon: boolean;
  subscribeSave: boolean;
  promoCode: string;
}): string {
  const name = productNameFromTitle(input.title);
  const tags = stackTags(input.clipCoupon, input.subscribeSave, input.promoCode);
  if (input.currentPrice == null || tags.length === 0) return name;
  const star = "*";
  const store = merchantLabel(input.merchant);
  return `[${tags.join(", ")}] ${money(input.currentPrice)}${star} | ${name} at ${store}`;
}

export function stackedBullets(input: {
  merchant: Merchant;
  currentPrice: number | null;
  listPrice: number | null;
  clipCoupon: boolean;
  subscribeSave: boolean;
  promoCode: string;
}): string[] {
  const store = merchantLabel(input.merchant);
  const pay = input.currentPrice != null ? money(input.currentPrice) : null;
  const was = input.listPrice != null ? money(input.listPrice) : null;
  const steps: string[] = [];
  if (input.clipCoupon && input.subscribeSave) {
    steps.push(
      pay
        ? `Clip the on-page coupon, then turn on Subscribe & Save. Cart should land at ${pay} after both.`
        : "Clip the on-page coupon, then turn on Subscribe & Save. Confirm the stacked total in the cart.",
    );
  } else if (input.clipCoupon) {
    steps.push(
      pay
        ? `Clip the on-page coupon before you check out. You should see ${pay} after it applies.`
        : "Clip the on-page coupon before you check out, then confirm the total.",
    );
  } else if (input.subscribeSave) {
    steps.push(
      pay
        ? `Turn on Subscribe & Save on this listing. With SnS the price should be ${pay}. You can cancel after it ships.`
        : "Turn on Subscribe & Save on this listing, then confirm the total. You can cancel after it ships.",
    );
  } else if (pay && was) {
    steps.push(`${pay} (was ${was}) at ${store}. Confirm the total at checkout.`);
  } else if (pay) {
    steps.push(`${pay} at ${store}. Confirm the total at checkout.`);
  } else {
    steps.push(`See the live price at ${store}. Do not guess from memory.`);
  }

  if (input.promoCode.trim()) {
    steps.push(`Enter code ${input.promoCode.trim()} at checkout, then check that the discount actually took.`);
  } else if (input.merchant === "amazon") {
    steps.push("Prime shipping if it qualifies, otherwise watch the $35 threshold.");
  } else {
    steps.push(`Check shipping or free store pickup at ${store}.`);
  }

  if (was && pay) {
    steps.push(`Was ${was}. If the cart does not match ${pay} after the stack, skip it.`);
  } else {
    steps.push("Confirm the live checkout price before you pay.");
  }
  return steps.slice(0, 3);
}

export function rewritePastedDeal(
  paste: string,
  current: {
    title: string;
    merchant: Merchant;
    currentPrice: string;
    listPrice: string;
    promoCode: string;
  },
): {
  clipCoupon: boolean;
  subscribeSave: boolean;
  promoCode: string;
  currentPrice: string;
  listPrice: string;
  bullets: string[];
} {
  const text = paste.trim();
  const lower = text.toLowerCase();
  const clipCoupon = /clip(?:\s+the)?\s+coupon|\bamazon coupon\b|\bac\b|% off coupon/.test(lower);
  const subscribeSave = /subscribe\s*(&|and)?\s*save|\bsns\b|\bs&s\b/.test(lower);
  const codeMatch = text.match(/\b(?:code|promo)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})\b/i);
  const promoCode = current.promoCode.trim() || (codeMatch ? codeMatch[1] : "");
  const amounts = [...text.matchAll(/\$([0-9]+(?:\.[0-9]{1,2})?)/g)].map((m) => Number.parseFloat(m[1]));
  let currentPrice = current.currentPrice;
  let listPrice = current.listPrice;
  if (amounts.length) {
    const stacked = Math.min(...amounts);
    const listed = Math.max(...amounts);
    if (!currentPrice) currentPrice = String(stacked);
    if (!listPrice && listed > stacked) listPrice = String(listed);
  }
  const live = Number.parseFloat(currentPrice);
  const list = Number.parseFloat(listPrice);
  return {
    clipCoupon,
    subscribeSave,
    promoCode,
    currentPrice,
    listPrice,
    bullets: stackedBullets({
      merchant: current.merchant,
      currentPrice: Number.isFinite(live) ? live : null,
      listPrice: Number.isFinite(list) ? list : null,
      clipCoupon,
      subscribeSave,
      promoCode,
    }),
  };
}
