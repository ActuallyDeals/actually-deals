"use client";

import { withAffiliate } from "@/lib/affiliate-client";
import { incrementClicks } from "@/lib/store";
import { cn } from "@/lib/utils";

export function GetDealButton({
  href,
  dealId,
  label,
  className,
}: {
  href: string;
  dealId?: string;
  label: string;
  className?: string;
}) {
  return (
    <a
      href={href || "#"}
      target={href ? "_blank" : undefined}
      rel={href ? "noopener noreferrer nofollow" : undefined}
      onClick={(event) => {
        if (!href) {
          event.preventDefault();
          return;
        }
        event.currentTarget.href = withAffiliate(href);
        if (dealId) {
          incrementClicks(dealId);
        }
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700",
        className,
      )}
    >
      {label}
    </a>
  );
}
