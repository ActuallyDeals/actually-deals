import { amazonCdnFallback, amazonCdnImage, upgradeAmazonImageUrl } from "@/lib/merchants";
import type { Merchant } from "@/lib/types";

export type ImageTier = "scraped" | "cdn" | "placeholder";

export function brandedPlaceholder(merchant: Merchant): string {
  return `/placeholders/${merchant}.svg`;
}

export function isBrandedPlaceholder(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith("/placeholders/") || value.includes("/placeholders/");
}

const JUNK_PATH =
  /logo|sprite|pixel|favicon|1x1|grey-pixel|gray-pixel|spinner|placeholder|icon[-_]|\/icons\/|nav-sprite|prime-logo|amazon-logo|smile-logo/i;
const TINY_AMAZON = /_(?:AC_)?(?:US|UL|UX|UY|SX|SY|SS)(?:2[0-9]|[3-9][0-9]|1[0-4]\d)_/i;

export function isJunkImageUrl(value: string): boolean {
  const lower = value.toLowerCase();
  if (isBrandedPlaceholder(lower)) return true;
  if (JUNK_PATH.test(lower)) return true;
  if (TINY_AMAZON.test(value)) return true;
  try {
    const url = new URL(value, "https://actuallydeals.com");
    const path = url.pathname.toLowerCase();
    if (path.endsWith(".svg") && /amazon|ssl-images-amazon|media-amazon/.test(url.hostname)) {
      return true;
    }
    if (path.endsWith(".gif") && /pixel|spacer|blank/.test(path)) return true;
  } catch {
    return true;
  }
  return false;
}

export function isUsableImageUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value, "https://actuallydeals.com");
    if (!["http:", "https:", "data:"].includes(url.protocol)) return false;
    if (url.protocol === "data:" && url.href.length < 80) return false;
    if (isJunkImageUrl(value)) return false;
    return true;
  } catch {
    return false;
  }
}

export function preferProductPhoto(value: string | null | undefined): string | null {
  if (!isUsableImageUrl(value)) return null;
  return upgradeAmazonImageUrl(value);
}

export function cdnImageFor(merchant: Merchant, productId: string | null): string | null {
  if (!productId) return null;
  if (merchant === "amazon") return amazonCdnImage(productId);
  return null;
}

export function resolveDealImage(input: {
  scrapedImageUrl?: string | null;
  merchant: Merchant;
  merchantProductId?: string | null;
}): { imageUrl: string; imageTier: ImageTier; cdnUrl: string | null } {
  const cdnUrl = cdnImageFor(input.merchant, input.merchantProductId ?? null);
  const scraped = preferProductPhoto(input.scrapedImageUrl);

  if (scraped) {
    return { imageUrl: scraped, imageTier: "scraped", cdnUrl };
  }
  if (cdnUrl) {
    return { imageUrl: cdnUrl, imageTier: "cdn", cdnUrl };
  }
  return {
    imageUrl: brandedPlaceholder(input.merchant),
    imageTier: "placeholder",
    cdnUrl,
  };
}

export function imageFallbackChain(input: {
  scrapedImageUrl?: string | null;
  merchant: Merchant;
  merchantProductId?: string | null;
}): string[] {
  const chain: string[] = [];
  const scraped = preferProductPhoto(input.scrapedImageUrl);
  if (scraped) chain.push(scraped);
  if (input.merchant === "amazon" && input.merchantProductId) {
    const primary = amazonCdnImage(input.merchantProductId);
    const secondary = amazonCdnFallback(input.merchantProductId);
    if (!chain.includes(primary)) chain.push(primary);
    if (!chain.includes(secondary)) chain.push(secondary);
  }
  const placeholder = brandedPlaceholder(input.merchant);
  if (!chain.includes(placeholder)) chain.push(placeholder);
  return chain;
}
