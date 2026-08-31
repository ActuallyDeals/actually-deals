import type { Metadata } from "next";
import Link from "next/link";
import { EditorialShell } from "@/components/editorial-shell";

export const metadata: Metadata = {
  title: "Learn",
  description: "How Actually Deals picks a listing and how coupon stacks actually work.",
};

export default function LearnPage() {
  return (
    <EditorialShell>
      <p className="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase">Learn</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        How this feed is supposed to work
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        The cards are short on purpose. These pages are the longer version: what we skip, what we
        check in the cart, and why a stack on the page is not a promise at checkout.
      </p>
      <ul className="mt-8 space-y-4">
        <li>
          <Link
            href="/learn/how-we-pick"
            className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm"
          >
            <span className="text-lg font-semibold text-slate-950">How we pick a deal</span>
            <span className="mt-1 block text-sm text-slate-500">
              Judgment, skip rules, and why the cart is the only score that counts.
            </span>
          </Link>
        </li>
        <li>
          <Link
            href="/learn/how-stacking-works"
            className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:shadow-sm"
          >
            <span className="text-lg font-semibold text-slate-950">How stacking works</span>
            <span className="mt-1 block text-sm text-slate-500">
              Named layers. We never assume two offers multiply just because they sit on the same page.
            </span>
          </Link>
        </li>
      </ul>
    </EditorialShell>
  );
}
