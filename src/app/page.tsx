import { Suspense } from "react";

import { DealCard } from "@/components/deals/DealCard";
import { DealFeed } from "@/components/deals/DealFeed";
import { listDeals } from "@/lib/server-db";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const deals = listDeals();
  const featured = deals[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-500">
          Today&apos;s finds
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Hot deals, posted as they drop
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Hand-picked prices from Amazon, Walmart, Macy&apos;s, Target, and more. Confirm the
          total at checkout — deals move fast.
        </p>
      </div>

      {featured ? (
        <div className="mb-8">
          <DealCard deal={featured} featured />
        </div>
      ) : null}

      <Suspense
        fallback={
          <div className="rounded-2xl border border-orange-100 bg-white px-6 py-16 text-center text-sm text-slate-500">
            Loading deals…
          </div>
        }
      >
        <DealFeed initialDeals={deals.slice(1)} />
      </Suspense>
    </div>
  );
}
