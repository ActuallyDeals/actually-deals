"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AliveVoteBar } from "@/components/deals/AliveVoteBar";
import { CommentThread } from "@/components/deals/CommentThread";
import { CopyButton } from "@/components/deals/CopyButton";
import { ProductImage } from "@/components/deals/ProductImage";
import { StoreLogo } from "@/components/stores/StoreLogo";
import { DEALS_EVENT, getDealBySlug, incrementClicks } from "@/lib/store";
import { formatMoney } from "@/lib/money";
import { formatRelativeTime } from "@/lib/time";
import type { Deal } from "@/lib/types";

export function DealDetailView({
  slug,
  initialDeal,
}: {
  slug: string;
  initialDeal: Deal | null;
}) {
  const [deal, setDeal] = useState<Deal | null>(initialDeal);
  const [ready, setReady] = useState(Boolean(initialDeal));

  useEffect(() => {
    const sync = () => {
      setDeal(getDealBySlug(slug) ?? initialDeal);
      setReady(true);
    };
    sync();
    window.addEventListener(DEALS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DEALS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [initialDeal, slug]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-sm text-slate-500">
        Loading deal…
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-slate-900">That deal is not in the desk.</h1>
        <p className="mt-2 text-slate-500">
          It may have been removed, or the slug is wrong. Head back to the live feed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
        >
          Back to deals
        </Link>
      </div>
    );
  }

  const price = formatMoney(deal.dealPrice);
  const msrp = formatMoney(deal.msrp);
  const expiredByVotes =
    deal.downvotes + deal.upvotes > 0 &&
    deal.downvotes / (deal.downvotes + deal.upvotes) > 0.7;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
        ← All deals
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StoreLogo name={deal.merchantName} />
            {deal.isPriceError ? (
              <span className="relative rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold uppercase text-white">
                🚨 Price Mistake
              </span>
            ) : null}
            {deal.isStackingHack ? (
              <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold uppercase text-white">
                ⚡ Coupon Stack
              </span>
            ) : null}
            {expiredByVotes || deal.isExpired ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                ⚠️ Reported Expired
              </span>
            ) : null}
            <span className="text-xs text-slate-400">{formatRelativeTime(deal.createdAt)}</span>
          </div>

          <div className="mt-4 flex h-72 items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-4">
            <ProductImage
              src={deal.imageUrl}
              alt={deal.title}
              merchantName={deal.merchantName}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            {price ? (
              <span className="text-4xl font-black text-emerald-600">
                {deal.dealPrice === 0 ? "FREE" : price}
              </span>
            ) : (
              <span className="text-xl font-black text-amber-600">Price pending</span>
            )}
            {msrp ? <span className="text-base text-slate-400 line-through">{msrp}</span> : null}
            {deal.discountPercent && deal.discountPercent > 0 ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                SAVE {deal.discountPercent}%
              </span>
            ) : null}
          </div>
          <h1 className="mt-3 text-2xl font-black leading-tight text-slate-900">{deal.title}</h1>

          <ul className="mt-5 space-y-3 text-sm text-slate-600">
            {deal.bullets.map((bullet) => (
              <li key={bullet.kind} className="rounded-xl bg-slate-50 p-3">
                <p className="font-bold text-slate-900">{bullet.label}</p>
                <p className="mt-1 leading-6">{bullet.text}</p>
                {bullet.kind === "action" && deal.couponCode ? (
                  <div className="mt-2">
                    <CopyButton value={deal.couponCode} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          <a
            href={deal.affiliateUrl || deal.dealUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() => incrementClicks(deal.id)}
            className="mt-5 hidden w-full items-center justify-center rounded-lg bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 lg:inline-flex"
          >
            Get Deal at {deal.merchantName} ↗
          </a>
          <p className="mt-2 hidden text-center text-[11px] text-slate-400 lg:block">
            Affiliate link • Terms apply
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">How to stack it</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {deal.stackingSteps.map((step) => (
            <li key={step.step} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
                Step {step.step}
              </p>
              <p className="mt-1 font-bold text-slate-900">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 space-y-6">
        <AliveVoteBar deal={deal} />
        <CommentThread dealId={deal.id} />
      </div>

      <div className="sticky bottom-3 z-20 mt-8 lg:hidden">
        <a
          href={deal.affiliateUrl || deal.dealUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={() => incrementClicks(deal.id)}
          className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700"
        >
          Get Deal at {deal.merchantName} ↗
        </a>
      </div>
    </div>
  );
}
