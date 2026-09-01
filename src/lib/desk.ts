import type { Deal } from "@/lib/types";

export function normalizeMerchantProductId(id: string | null | undefined): string | null {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

export function findDuplicateDeal(
  deals: Deal[],
  merchantProductId: string | null | undefined,
  exceptSlug?: string | null,
): Deal | null {
  const id = normalizeMerchantProductId(merchantProductId);
  if (!id) return null;
  return (
    deals.find((deal) => {
      if (exceptSlug && deal.slug === exceptSlug) return false;
      return normalizeMerchantProductId(deal.merchantProductId) === id;
    }) ?? null
  );
}
