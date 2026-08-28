"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { FeedFilter } from "@/lib/types";
import { cn } from "@/lib/utils";

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "Frontpage" },
  { id: "price-errors", label: "Price Drops" },
  { id: "coupon-stacks", label: "Coupons" },
  { id: "amazon", label: "Amazon" },
];

type DealFiltersProps = {
  filter: FeedFilter;
  query: string;
  onFilterChange: (filter: FeedFilter) => void;
  onQueryChange: (query: string) => void;
};

export function DealFilters({
  filter,
  query,
  onFilterChange,
  onQueryChange,
}: DealFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onFilterChange(item.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filter === item.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="relative block w-full lg:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search stores, products, or codes"
          className="h-10 rounded-full border-slate-200 bg-white pl-9"
        />
      </label>
    </div>
  );
}
