"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Frontpage" },
  { href: "/?filter=price-errors", label: "Price Drops" },
  { href: "/?filter=coupon-stacks", label: "Coupons" },
  { href: "/?filter=amazon", label: "Amazon" },
];

function HeaderSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  return (
    <form
      className="relative hidden min-w-0 flex-1 md:block"
      onSubmit={(event) => {
        event.preventDefault();
        const next = query.trim();
        router.push(next ? `/?q=${encodeURIComponent(next)}` : "/");
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search deals"
        className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"
      />
    </form>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-emerald-600 text-sm font-black text-white">
            AD
          </span>
          <span className="text-lg font-black tracking-tight text-slate-900">
            Actually <span className="text-emerald-600">Deals</span>
          </span>
        </Link>
        <Suspense fallback={null}>
          <HeaderSearch />
        </Suspense>
        <nav className="ml-auto flex flex-wrap items-center justify-end gap-1 text-sm font-semibold">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-100",
                pathname === "/" && link.href === "/" && "bg-slate-900 text-white hover:bg-slate-900",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="rounded-full bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
          >
            Post a Deal
          </Link>
        </nav>
      </div>
    </header>
  );
}
