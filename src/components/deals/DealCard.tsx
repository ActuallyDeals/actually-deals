"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CopyButton } from "@/components/deals/CopyButton";
import { ProductImage } from "@/components/deals/ProductImage";
import { StoreLogo } from "@/components/stores/StoreLogo";
import { incrementClicks } from "@/lib/store";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime } from "@/lib/time";
import type { Deal } from "@/lib/types";
import { cn } from "@/lib/utils";

type DealCardProps = {
  deal: Deal;
  compact?: boolean;
  trackClicks?: boolean;
};

export function DealCard({ deal, compact = false, trackClicks = true }: DealCardProps) {
  const [relative, setRelative] = useState("");
  const price = formatMoney(deal.dealPrice);
  const msrp = formatMoney(deal.msrp);
  const expired =
    deal.isExpired ||
    (deal.downvotes + deal.upvotes > 0 &&
      deal.downvotes / (deal.downvotes + deal.upvotes) > 0.7);

  useEffect(() => {
    setRelative(formatRelativeTime(deal.createdAt));
  }, [deal.createdAt]);

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        compact && "shadow-none hover:translate-y-0",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <StoreLogo name={deal.merchantName} />
          {deal.isPriceError ? (
            <span className="rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase text-white">
              Price Error
            </span>
          ) : null}
          {deal.couponCode ? (
            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold uppercase text-white">
              w/ Code
            </span>
          ) : null}
          {expired ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
              Expired
            </span>
          ) : null}
        </div>
        <time className="shrink-0 text-xs font-medium text-slate-400" dateTime={deal.createdAt}>
          {relative}
        </time>
      </div>

      <div className="mx-4 mt-3 flex h-52 items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-3">
        <ProductImage src={deal.imageUrl} alt={deal.title} merchantName={deal.merchantName} />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <div className="flex flex-wrap items-end gap-2">
          {price ? (
            <span className="text-3xl font-black tracking-tight text-emerald-600">
              {deal.dealPrice === 0 ? "FREE" : price}
            </span>
          ) : (
            <span className="text-lg font-black text-slate-500">See price</span>
          )}
          {msrp ? (
            <span className="mb-1 text-sm font-medium text-slate-400 line-through">{msrp}</span>
          ) : null}
          {deal.discountPercent && deal.discountPercent > 0 ? (
            <span className="mb-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {deal.discountPercent}% off
            </span>
          ) : null}
        </div>

        <Link
          href={`/deal/${deal.slug}`}
          className="mt-2 line-clamp-2 text-base font-bold text-slate-900 transition-colors hover:text-emerald-600"
        >
          {deal.title}
        </Link>

        {deal.couponCode ? (
          <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold">Code</span>
            <code className="rounded bg-slate-100 px-2 py-0.5 font-bold">{deal.couponCode}</code>
            <CopyButton value={deal.couponCode} />
          </div>
        ) : null}

        <a
          href={deal.affiliateUrl || deal.dealUrl || "#"}
          target={deal.dealUrl ? "_blank" : undefined}
          rel={deal.dealUrl ? "noopener noreferrer nofollow" : undefined}
          onClick={(event) => {
            if (!deal.dealUrl) {
              event.preventDefault();
              return;
            }
            if (trackClicks) {
              incrementClicks(deal.id);
            }
          }}
          className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
        >
          Get Deal at {deal.merchantName || "Store"}
        </a>
      </div>
    </article>
  );
}
