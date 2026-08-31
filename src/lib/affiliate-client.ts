const TAG_KEY = "actually-deals:amazon-tag";

export function getAmazonTag(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG?.trim() || "actuallydea07-20";
  }
  return (
    window.localStorage.getItem(TAG_KEY)?.trim() ||
    process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG?.trim() ||
    "actuallydea07-20"
  );
}

export function setAmazonTag(tag: string) {
  window.localStorage.setItem(TAG_KEY, tag.trim());
}

export function withAffiliate(url: string): string {
  if (!url) {
    return url;
  }
  try {
    const parsed = new URL(url);
    const tag = getAmazonTag();
    if (tag && /amazon\./i.test(parsed.hostname)) {
      parsed.searchParams.set("tag", tag);
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}
