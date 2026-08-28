"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CopyButton } from "@/components/deals/CopyButton";
import { ProductImage } from "@/components/deals/ProductImage";
import { merchantEmoji } from "@/data/merchants";
import { incrementClicks } from "@/lib/store";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime } from "@/lib/time";
import type { Deal } from "@/lib/types";
import { cn } from "@/lib/utils";

const BULLET_ICON: Record<string, string> = {
  price: "🏷️",
  shipping: "📦",
  action: "⚡",
};

type DealCardProps = {
  deal: Deal;
  compact?: boolean;
  trackClicks?: boolean;
};

export function DealCard({ deal, compact = false, trackClicks = true }: DealCardProps) {
  const [relative, setRelative] = useState("just now");
  const price = formatMoney(deal.dealPrice);
  const msrp = formatMoney(deal.msrp);
  const expiredByVotes =
    deal.downvotes + deal.upvotes > 0 &&
    deal.downvotes / (deal.downvotes + deal.upvotes) > 0.7;

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
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            {merchantEmoji(deal.merchantName)} {deal.merchantName}
          </span>
          {deal.isPriceError ? (
            <span className="relative inline-flex items-center rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              <span className="absolute -right-0.5 -top-0.5 size-2 animate-ping rounded-full bg-red-400" />
              🚨 Price Mistake
            </span>
          ) : null}
          {deal.isStackingHack && !deal.isPriceError ? (
            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
              ⚡ Coupon Stack
            </span>
          ) : null}
          {expiredByVotes || deal.isExpired ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
              ⚠️ Reported Expired
            </span>
          ) : null}
        </div>
        <time className="shrink-0 text-xs font-medium text-slate-400" dateTime={deal.createdAt}>
          {relative}
        </time>
      </div>

      <div className="mx-4 mt-3 flex h-52 items-center justify-center overflow-hidden rounded-xl bg-white p-3">
        <ProductImage
          src={deal.imageUrl}
          alt={deal.title}
          merchantName={deal.merchantName}
        />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <div className="flex flex-wrap items-end gap-2">
          {price ? (
            <span className="text-3xl font-black tracking-tight text-emerald-600">
              {deal.dealPrice === 0 ? "FREE" : price}
            </span>
          ) : (
            <span className="text-lg font-black text-amber-600">Price pending</span>
          )}
          {msrp ? (
            <span className="mb-1 text-sm font-medium text-slate-400 line-through">{msrp}</span>
          ) : null}
          {deal.discountPercent && deal.discountPercent > 0 ? (
            <span className="mb-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
              SAVE {deal.discountPercent}%
            </span>
          ) : null}
        </div>

        <Link
          href={`/deal/${deal.slug}`}
          className="mt-2 line-clamp-2 text-base font-bold text-slate-900 transition-colors hover:text-emerald-600"
        >
          {deal.title}
        </Link>

        <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
          {deal.bullets.slice(0, 3).map((bullet) => (
            <li key={`${deal.id}-${bullet.kind}`} className="flex gap-2">
              <span aria-hidden>{BULLET_ICON[bullet.kind] ?? "•"}</span>
              <p>
                <span className="font-semibold text-slate-800">{bullet.label}:</span>{" "}
                {bullet.text}
                {bullet.kind === "action" && deal.couponCode ? (
                  <span className="ml-2 inline-flex align-middle">
                    <CopyButton value={deal.couponCode} />
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>

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
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
        >
          Get Deal at {deal.merchantName} ↗
        </a>
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Affiliate link • Terms apply
        </p>
      </div>
    </article>
  );
}
