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
  return title.replace(TITLE_PREFIX, "").replace(/\s+at (?:Amazon|Walmart|Target|Home Depot|Best Buy|Costco)$/i, "").trim() || title.trim();
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

export function looksClonedWriteup(text: string): boolean {
  const blob = text.trim();
  if (!blob) return false;
  return (
    /deal score/i.test(blob) ||
    /frontpage deal/i.test(blob) ||
    /slickdeals/i.test(blob) ||
    /add to (?:your )?next delivery/i.test(blob) ||
    /amazon\.com\/dp/i.test(blob)
  );
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

export function stackedWhyNote(input: {
  currentPrice: number | null;
  clipCoupon: boolean;
  subscribeSave: boolean;
  promoCode: string;
}): string {
  const pay = input.currentPrice != null ? money(input.currentPrice) : null;
  if (input.clipCoupon && input.subscribeSave) {
    return pay
      ? `Clip the coupon and turn on Subscribe & Save; cart should be ${pay}.`
      : "Clip the coupon and turn on Subscribe & Save, then confirm the stacked total in the cart.";
  }
  if (input.clipCoupon) {
    return pay
      ? `Clip the on-page coupon; cart should be ${pay}.`
      : "Clip the on-page coupon, then confirm the total.";
  }
  if (input.subscribeSave) {
    return pay
      ? `Turn on Subscribe & Save; cart should be ${pay}.`
      : "Turn on Subscribe & Save, then confirm the total.";
  }
  if (input.promoCode.trim()) {
    return pay
      ? `Use code ${input.promoCode.trim()}; cart should be ${pay}.`
      : `Use code ${input.promoCode.trim()} at checkout, then confirm the total.`;
  }
  return pay
    ? `Pay ${pay} on the listing. Confirm the total at checkout.`
    : "Confirm the live checkout price before you pay.";
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
  const was =
    input.listPrice != null &&
    input.currentPrice != null &&
    input.listPrice > input.currentPrice
      ? money(input.listPrice)
      : null;
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

type DollarHit = { value: number; index: number; length: number };

function parsePriceString(value: string): number | null {
  const n = Number.parseFloat(value.trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

function dollarHits(text: string): DollarHit[] {
  const hits: DollarHit[] = [];
  for (const match of text.matchAll(/\$([0-9]+(?:\.[0-9]{1,2})?)/g)) {
    if (match.index == null) continue;
    const value = Number.parseFloat(match[1]);
    if (!Number.isFinite(value)) continue;
    hits.push({ value: Math.round(value * 100) / 100, index: match.index, length: match[0].length });
  }
  return hits;
}

function isIgnoredHit(text: string, hit: DollarHit): boolean {
  const before = text.slice(Math.max(0, hit.index - 28), hit.index);
  const after = text.slice(hit.index + hit.length, hit.index + hit.length + 10);
  const local = `${before} ${after}`;
  if (/deal score|frontpage deal|deal history|slickdeals/i.test(local)) return true;
  if (/add to (?:your )?next delivery/i.test(local)) return true;
  if (/\bper[-.\s/]*(oz|ounce|lb|pound|ct|count|unit)\b|\bunit price\b/i.test(local)) return true;
  if (/^\s*\/\s*(oz|ounce|lb|pound|ct|count)|^\s*per\b/i.test(after)) return true;
  if (/\d{1,2}%\s*[:.\-]?\s*$/.test(text.slice(Math.max(0, hit.index - 10), hit.index))) return true;
  return false;
}

function prefixEquals(text: string, hit: DollarHit): boolean {
  return /=\s*$/.test(text.slice(Math.max(0, hit.index - 8), hit.index));
}

function prefixHasStackWords(text: string, hit: DollarHit): boolean {
  const prefix = text.slice(Math.max(0, hit.index - 120), hit.index);
  return /clip|coupon|subscribe\s*(?:&|and)?\s*save|\bsns\b|s&s/i.test(prefix);
}

function isForPriceHit(text: string, hit: DollarHit): boolean {
  return /\bfor\s*$/i.test(text.slice(Math.max(0, hit.index - 5), hit.index));
}

function isTitlePipeHit(text: string, hit: DollarHit): boolean {
  return /^\*?\s*\|/.test(text.slice(hit.index + hit.length));
}

function findStackedTotal(text: string): number | null {
  const hits = dollarHits(text).filter((hit) => !isIgnoredHit(text, hit) && prefixEquals(text, hit));
  const withWords = hits.filter((hit) => prefixHasStackWords(text, hit));
  return (withWords[0] ?? hits[0])?.value ?? null;
}

function findShelfPrice(text: string, stacked: number | null): number | null {
  const hits = dollarHits(text).filter((hit) => !isIgnoredHit(text, hit));
  const usable = (hit: DollarHit) => stacked == null || hit.value > stacked;
  const forHit = hits.find((hit) => usable(hit) && isForPriceHit(text, hit));
  if (forHit) return forHit.value;
  const titleHit = hits.find((hit) => usable(hit) && isTitlePipeHit(text, hit));
  if (titleHit) return titleHit.value;
  const first = hits.find(
    (hit) => usable(hit) && !prefixEquals(text, hit) && !isTitlePipeHit(text, hit),
  );
  return first?.value ?? null;
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
  const clipCoupon =
    /clip(?:\s+the)?\s+coupon|\bamazon coupon\b|\bac\b|% off coupon|\bclip\s+\d+\s*%/.test(lower);
  const subscribeSave = /subscribe\s*(&|and)?\s*save|\bsns\b|\bs&s\b/.test(lower);
  const codeMatch = text.match(/\b(?:code|promo)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})\b/i);
  const promoCode = current.promoCode.trim() || (codeMatch ? codeMatch[1] : "");

  const stacked = findStackedTotal(text);
  const shelf = findShelfPrice(text, stacked);
  let live = parsePriceString(current.currentPrice);
  let list = parsePriceString(current.listPrice);

  if (stacked != null && (clipCoupon || subscribeSave)) {
    live = stacked;
  } else if (live == null && stacked != null) {
    live = stacked;
  } else if (live == null && shelf != null) {
    live = shelf;
  }

  if (list == null || (live != null && list <= live)) {
    list = shelf != null && (live == null || shelf > live) ? shelf : null;
  }
  if (list != null && live != null && list <= live) {
    list = null;
  }

  const currentPrice = live != null ? String(live) : current.currentPrice;
  const listPrice = list != null ? String(list) : "";

  return {
    clipCoupon,
    subscribeSave,
    promoCode,
    currentPrice,
    listPrice,
    bullets: stackedBullets({
      merchant: current.merchant,
      currentPrice: live,
      listPrice: list,
      clipCoupon,
      subscribeSave,
      promoCode,
    }),
  };
}
