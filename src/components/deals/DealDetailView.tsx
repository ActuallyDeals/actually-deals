"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AliveVoteBar } from "@/components/deals/AliveVoteBar";
import { CommentThread } from "@/components/deals/CommentThread";
import { CopyButton } from "@/components/deals/CopyButton";
import { ProductImage } from "@/components/deals/ProductImage";
import { StoreLogo } from "@/components/stores/StoreLogo";
import { displayDealTitle } from "@/lib/deal-ingest";
import { incrementClicks } from "@/lib/store";
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
    let cancelled = false;
    fetch(`/api/deals/${slug}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { deal?: Deal } | null) => {
        if (!cancelled) {
          setDeal(payload?.deal ?? initialDeal);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeal(initialDeal);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialDeal, slug]);

  if (!ready) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-slate-500">
        Loading deal…
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-slate-900">That deal is gone.</h1>
        <p className="mt-2 text-slate-500">It may have sold out or the link is old.</p>
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
  const saved =
    deal.dealPrice !== null && deal.msrp !== null ? formatMoney(deal.msrp - deal.dealPrice) : null;
  const title = displayDealTitle(deal);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/" className="text-sm font-semibold text-orange-600 hover:text-orange-700">
        ← All deals
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StoreLogo name={deal.merchantName} />
        <time className="text-sm text-slate-400">{formatRelativeTime(deal.createdAt)}</time>
      </div>

      <h1 className="mt-3 text-3xl font-black leading-tight text-slate-900 md:text-4xl">{title}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-orange-100 bg-white p-6">
          <ProductImage src={deal.imageUrl} alt={title} merchantName={deal.merchantName} />
        </div>

        <aside className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-2">
            {price ? (
              <span className="text-5xl font-black text-emerald-600">
                {deal.dealPrice === 0 ? "FREE" : price}
              </span>
            ) : (
              <span className="text-2xl font-black text-slate-500">See price</span>
            )}
            {msrp ? <span className="mb-1 text-lg text-slate-400 line-through">{msrp}</span> : null}
          </div>
          {deal.discountPercent && deal.discountPercent > 0 ? (
            <p className="mt-2 text-sm font-bold text-emerald-700">
              {deal.discountPercent}% off
              {saved ? ` · you save ${saved}` : ""}
            </p>
          ) : null}

          {deal.couponCode ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2">
              <span className="text-sm font-semibold text-slate-700">Code</span>
              <code className="font-black text-orange-700">{deal.couponCode}</code>
              <CopyButton value={deal.couponCode} />
            </div>
          ) : null}

          <ul className="mt-5 space-y-2 text-sm leading-6 text-slate-600">
            {deal.bullets.map((bullet) => (
              <li key={bullet.kind}>
                <span className="font-bold text-slate-900">{bullet.label}:</span> {bullet.text}
              </li>
            ))}
          </ul>

          <a
            href={deal.affiliateUrl || deal.dealUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() => incrementClicks(deal.id)}
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Get Deal at {deal.merchantName}
          </a>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Affiliate link — we may earn a commission at no extra cost to you.
          </p>
        </aside>
      </div>

      <section className="mt-6 rounded-2xl border border-orange-100 bg-white p-6">
        <h2 className="text-lg font-black text-slate-900">How to get it</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {deal.stackingSteps.map((step) => (
            <li key={step.step} className="rounded-xl bg-orange-50/70 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
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
          className="flex w-full items-center justify-center rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-lg"
        >
          Get Deal at {deal.merchantName}
        </a>
      </div>
    </div>
  );
}
