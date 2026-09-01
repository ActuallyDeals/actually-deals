import type { Deal, Merchant } from "@/lib/types";

export function normalizeMerchantProductId(id: string | null | undefined): string | null {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

export function normalizePromoCode(code: string | null | undefined): string | null {
  const trimmed = code?.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

export function findDuplicateDeal(
  deals: Deal[],
  merchant: Merchant,
  merchantProductId: string | null | undefined,
  promoCode?: string | null,
  exceptSlug?: string | null,
): Deal | null {
  const id = normalizeMerchantProductId(merchantProductId);
  const code = normalizePromoCode(promoCode);
  if (!id && !code) return null;
  return (
    deals.find((deal) => {
      if (exceptSlug && deal.slug === exceptSlug) return false;
      if (deal.merchant !== merchant) return false;
      if (id && normalizeMerchantProductId(deal.merchantProductId) === id) return true;
      return Boolean(code && normalizePromoCode(deal.promoCode) === code);
    }) ?? null
  );
}
