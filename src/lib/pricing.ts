import { percentOff, type Deal } from "@/lib/types";

/**
 * Gift-card face value from a URL or title ($100, 100-value, 100 value).
 * This is a was-price hint only — never a live sale price.
 */
export function giftCardFaceValue(...blobs: Array<string | null | undefined>): number | null {
  const text = blobs.filter(Boolean).join(" ");
  if (!text) return null;
  const match =
    text.match(/(\d{2,4})(?:\.\d{2})?\s*-\s*value/i) ||
    text.match(/\$(\d{2,4})(?:\.\d{2})?/i) ||
    text.match(/\b(\d{2,4})(?:\.\d{2})?\s+value\b/i);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  if (!Number.isFinite(value) || value < 5 || value > 2000) return null;
  return Math.round(value * 100) / 100;
}


/**
 * Show the listing price on cards and detail.
 * Amazon TOS still requires the Get Deal click to confirm at Amazon.
 */
export function publicPriceDisplay(
  deal: Pick<Deal, "merchant" | "currentPrice" | "listPrice">,
  options?: { staffPreview?: boolean },
): {
  headline: string;
  listPrice: number | null;
  percent: number | null;
  asOfLabel: string | null;
} {
  void options;
  return {
    headline: "",
    listPrice: deal.listPrice != null && deal.listPrice > deal.currentPrice ? deal.listPrice : null,
    percent: percentOff(deal),
    asOfLabel: null,
  };
}
