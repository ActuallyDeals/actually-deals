import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function DealNotFound() {
  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">That deal is gone</h1>
        <p className="mt-2 text-sm text-slate-500">
          It was never published, or the slug no longer exists. The live feed is the source of truth.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700"
        >
          Back to the feed
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
