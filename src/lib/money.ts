export function parseMoney(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? roundMoney(value) : null;
  }

  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) {
    return null;
  }

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? roundMoney(parsed) : null;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatMoney(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function computeDiscountPercent(
  dealPrice: number | null,
  msrp: number | null,
): number | null {
  if (dealPrice === null || msrp === null || msrp <= 0 || dealPrice < 0) {
    return null;
  }

  if (dealPrice >= msrp) {
    return 0;
  }

  return Math.round(((msrp - dealPrice) / msrp) * 100);
}
