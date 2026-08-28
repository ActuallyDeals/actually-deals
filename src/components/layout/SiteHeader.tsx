"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Live Feed" },
  { href: "/?filter=price-errors", label: "Price Errors" },
  { href: "/?filter=coupon-stacks", label: "Stacks" },
  { href: "/admin", label: "Admin Desk" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0">
          <p className="text-lg font-black tracking-tight text-slate-900">
            Actually <span className="text-emerald-600">Deals</span>
          </p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            actuallydeals.com
          </p>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm font-semibold">
          {LINKS.map((link) => {
            const active =
              link.href === "/admin"
                ? pathname.startsWith("/admin")
                : link.href === "/" && pathname === "/";
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  active && "bg-slate-900 text-white hover:bg-slate-900 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
