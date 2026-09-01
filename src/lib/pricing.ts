import { percentOff, type Deal } from "@/lib/types";

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
    listPrice: deal.listPrice,
    percent: percentOff(deal),
    asOfLabel: null,
  };
}
