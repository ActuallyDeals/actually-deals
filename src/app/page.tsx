import { Suspense } from "react";

import { DealFeed } from "@/components/deals/DealFeed";
import { SEED_DEALS } from "@/data/seed-deals";

export default function HomePage() {
  const featured = SEED_DEALS.find((deal) => deal.isFeatured);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white px-6 py-8 shadow-sm md:px-10">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
          actuallydeals.com
        </p>
        <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
          The deal is real. The price is checked.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          High-trust write-ups in the Dan&apos;s Deals style, Hip2Save card density, and
          Glitched Deals urgency — without inventing a sale price when Amazon or anyone else
          blocks the scrape.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
            Historic price context
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">Coupon stacks</span>
          <span className="rounded-full bg-red-50 px-3 py-1 text-red-800">Price mistakes</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            Alive vs expired votes
          </span>
        </div>
        {featured ? (
          <p className="mt-6 text-sm text-slate-500">
            Featured right now:{" "}
            <span className="font-semibold text-slate-800">{featured.title}</span>
          </p>
        ) : null}
      </section>

      <p className="mt-6 text-xs text-slate-400">
        The cards below are an editorial sample feed so the desk can be judged. Publish live
        listings from Admin. The parser will not invent a price.
      </p>

      <div className="mt-5">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
              Loading the live desk…
            </div>
          }
        >
          <DealFeed initialDeals={SEED_DEALS} />
        </Suspense>
      </div>
    </div>
  );
}
