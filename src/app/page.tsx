import { Suspense } from "react";

import { DealFeed } from "@/components/deals/DealFeed";
import { SEED_DEALS } from "@/data/seed-deals";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Hot Deals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Today&apos;s best prices from Amazon, Walmart, Target, and more.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-sm text-slate-500">
            Loading deals…
          </div>
        }
      >
        <DealFeed initialDeals={SEED_DEALS} />
      </Suspense>
    </div>
  );
}
