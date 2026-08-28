"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductImage } from "@/components/deals/ProductImage";
import { StoreLogo } from "@/components/stores/StoreLogo";
import { displayDealTitle } from "@/lib/deal-ingest";
import { GetDealButton } from "@/components/deals/GetDealButton";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime } from "@/lib/time";
import type { Deal } from "@/lib/types";
import { cn } from "@/lib/utils";

type DealCardProps = {
  deal: Deal;
  compact?: boolean;
  trackClicks?: boolean;
  featured?: boolean;
};

export function DealCard({
  deal,
  compact = false,
  trackClicks = true,
  featured = false,
}: DealCardProps) {
  const [relative, setRelative] = useState("");
  const price = formatMoney(deal.dealPrice);
  const msrp = formatMoney(deal.msrp);
  const title = displayDealTitle(deal);
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
        "flex h-full flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        featured && "md:flex-row",
        compact && "shadow-none hover:translate-y-0",
      )}
    >
      <Link
        href={`/deal/${deal.slug}`}
        className={cn(
          "flex items-center justify-center bg-orange-50 p-4",
          featured ? "md:w-[42%] md:min-h-72" : "h-56",
        )}
      >
        <ProductImage src={deal.imageUrl} alt={title} merchantName={deal.merchantName} />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StoreLogo name={deal.merchantName} />
          {deal.couponCode ? (
            <span className="rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold uppercase text-white">
              w/ Code
            </span>
          ) : null}
          {expired ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
              Expired
            </span>
          ) : null}
          <time className="ml-auto text-xs font-medium text-slate-400" dateTime={deal.createdAt}>
            {relative}
          </time>
        </div>

        <Link
          href={`/deal/${deal.slug}`}
          className="mt-3 line-clamp-3 text-xl font-black leading-snug text-slate-900 hover:text-orange-600"
        >
          {title}
        </Link>

        <div className="mt-3 flex flex-wrap items-end gap-2">
          {price ? (
            <span className="text-3xl font-black text-emerald-600">
              {deal.dealPrice === 0 ? "FREE" : price}
            </span>
          ) : null}
          {msrp ? <span className="mb-1 text-slate-400 line-through">{msrp}</span> : null}
          {deal.discountPercent && deal.discountPercent > 0 ? (
            <span className="mb-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              {deal.discountPercent}% off
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex gap-2 pt-5">
          <Link
            href={`/deal/${deal.slug}`}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            See details
          </Link>
          <GetDealButton
            href={deal.affiliateUrl || deal.dealUrl}
            dealId={trackClicks ? deal.id : undefined}
            label="Get Deal"
            className="flex-1"
          />
        </div>
      </div>
    </article>
  );
}
