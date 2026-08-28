"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { DealCard } from "@/components/deals/DealCard";
import { DealFilters } from "@/components/deals/DealFilters";
import { DEALS_EVENT, filterDeals, getAllDeals } from "@/lib/store";
import type { Deal, FeedFilter } from "@/lib/types";

const FILTERS: FeedFilter[] = ["all", "price-errors", "coupon-stacks", "amazon"];

function asFilter(value: string | null): FeedFilter {
  return FILTERS.includes(value as FeedFilter) ? (value as FeedFilter) : "all";
}

export function DealFeed({ initialDeals }: { initialDeals: Deal[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [deals, setDeals] = useState(initialDeals);
  const filter = asFilter(searchParams.get("filter"));
  const query = searchParams.get("q") ?? "";

  useEffect(() => {
    const sync = () => setDeals(getAllDeals());
    sync();
    window.addEventListener(DEALS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(DEALS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const visible = useMemo(
    () => filterDeals(deals, { filter, query }),
    [deals, filter, query],
  );

  function updateParams(next: { filter?: FeedFilter; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextFilter = next.filter ?? filter;
    const nextQuery = next.q ?? query;

    if (nextFilter === "all") {
      params.delete("filter");
    } else {
      params.set("filter", nextFilter);
    }

    if (!nextQuery.trim()) {
      params.delete("q");
    } else {
      params.set("q", nextQuery);
    }

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <section className="space-y-5">
      <DealFilters
        filter={filter}
        query={query}
        onFilterChange={(value) => updateParams({ filter: value })}
        onQueryChange={(value) => updateParams({ q: value })}
      />

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-lg font-bold text-slate-900">No deals match that filter.</p>
          <p className="mt-2 text-sm text-slate-500">
            Clear search or publish a live listing from the admin desk. Prices are never invented
            when a retailer blocks a scrape.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((deal) => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </section>
  );
}
