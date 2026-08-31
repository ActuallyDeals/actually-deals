"use client";

import { useMemo, useState } from "react";
import { imageFallbackChain } from "@/lib/images";
import type { Deal } from "@/lib/types";

interface DealImageProps {
  deal: Pick<Deal, "scrapedImageUrl" | "merchant" | "merchantProductId" | "imageUrl" | "title">;
  className?: string;
  sizes?: string;
}

export function DealImage({ deal, className }: DealImageProps) {
  const chain = useMemo(() => {
    const resolved = imageFallbackChain({
      scrapedImageUrl: deal.scrapedImageUrl ?? deal.imageUrl,
      merchant: deal.merchant,
      merchantProductId: deal.merchantProductId,
    });
    if (deal.imageUrl && !resolved.includes(deal.imageUrl)) {
      return [deal.imageUrl, ...resolved];
    }
    return resolved;
  }, [deal.imageUrl, deal.merchant, deal.merchantProductId, deal.scrapedImageUrl]);

  const [index, setIndex] = useState(0);
  const src = chain[Math.min(index, chain.length - 1)] ?? deal.imageUrl;

  return (
    <img
      src={src}
      alt={deal.title}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        setIndex((current) => (current < chain.length - 1 ? current + 1 : current));
      }}
    />
  );
}
