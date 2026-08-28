"use client";

import { useState } from "react";

import { merchantPlaceholderDataUri } from "@/lib/deal-ingest";

type ProductImageProps = {
  src: string;
  alt: string;
  merchantName: string;
  className?: string;
};

export function ProductImage({
  src,
  alt,
  merchantName,
  className,
}: ProductImageProps) {
  const fallback = merchantPlaceholderDataUri(merchantName);
  const [current, setCurrent] = useState(src || fallback);

  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      className={className ?? "max-h-full max-w-full object-contain"}
      onError={() => {
        if (current !== fallback) {
          setCurrent(fallback);
        }
      }}
    />
  );
}
