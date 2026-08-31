import { percentOff, type Deal } from "@/lib/types";

/**
 * Public Amazon prices are not live Amazon-served data until PA-API exists.
 * Cards/detail show "See price at Amazon" instead of a hand-typed number.
 * Staff preview may still show the number the editor just scraped or typed.
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
  if (deal.merchant === "amazon" && !options?.staffPreview) {
    return {
      headline: "See price at Amazon",
      listPrice: null,
      percent: null,
      asOfLabel: null,
    };
  }
  return {
    headline: "",
    listPrice: deal.listPrice,
    percent: percentOff(deal),
    asOfLabel: null,
  };
}
