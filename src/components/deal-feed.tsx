"use client";

import { useEffect, useMemo, useState } from "react";
import { DealCard } from "@/components/deal-card";
import { Input } from "@/components/ui/input";
import { FEED_FILTERS, isCommunityExpired, type Deal, type FeedFilter } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTER_LABELS: Record<FeedFilter, string> = {
  all: "All Deals",
  "price-mistakes": "Price Mistakes",
  coupons: "Coupons",
  amazon: "Amazon",
};

function matchesFilter(deal: Deal, filter: FeedFilter, query: string): boolean {
  const haystack = [deal.title, deal.merchant, deal.category, deal.promoCode ?? ""]
    .join(" ")
    .toLowerCase();
  if (query && !haystack.includes(query.toLowerCase())) return false;
  if (filter === "all") return true;
  if (filter === "price-mistakes") return deal.isPriceMistake;
  if (filter === "coupons") return Boolean(deal.promoCode || deal.isStackingHack);
  return deal.merchant === "amazon" || deal.category === "amazon-finds";
}

export function DealFeed({
  deals,
  initialFilter = "all",
}: {
  deals: Deal[];
  initialFilter?: FeedFilter;
}) {
  const [filter, setFilter] = useState<FeedFilter>(initialFilter);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const visible = useMemo(
    () => deals.filter((deal) => matchesFilter(deal, filter, query)),
    [deals, filter, query],
  );
  const live = visible.filter((deal) => !isCommunityExpired(deal));
  const expired = visible.filter((deal) => isCommunityExpired(deal));

  if (deals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <h2 className="text-lg font-semibold text-slate-900">The feed is empty</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Nothing published yet. Open the editor desk and parse a merchant URL to ship the first card.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {FEED_FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "underline-offset-4",
                filter === item
                  ? "font-semibold text-slate-950 underline"
                  : "text-slate-500 hover:text-slate-900",
              )}
            >
              {FILTER_LABELS[item]}
            </button>
          ))}
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search store, title, or code"
          className="h-9 sm:ml-auto sm:max-w-xs"
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          No deals match that filter.
        </div>
      ) : (
        <>
          {live.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
          {expired.length > 0 ? (
            <div className="pt-4">
              <h2 className="mb-3 text-xs font-bold tracking-wider text-slate-400 uppercase">
                Community marked expired
              </h2>
              <div className="space-y-4">
                {expired.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
