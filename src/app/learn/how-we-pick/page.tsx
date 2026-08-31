import type { Metadata } from "next";
import Link from "next/link";
import { EditorialShell } from "@/components/editorial-shell";

export const metadata: Metadata = {
  title: "How we pick a deal",
  description: "Judgment, skip rules, and verifying a price in the cart before it hits the feed.",
};

export default function HowWePickPage() {
  return (
    <EditorialShell>
    <article>
      <p className="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase">Learn</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">How we pick a deal</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        A card on Actually Deals is an editor saying: we opened this listing, we could name the SKU,
        and we are willing to be wrong in public if the cart does not match. It is not a screenshot
        contest and it is not a rumor desk.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-950">Where a post starts</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        We start from a product URL. If the link is a store homepage, a category page, or a search
        result, it does not get a Get Deal button. We need a real item page so you land on the same
        SKU we looked at.
      </p>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        The desk tries to read title, photo, and price from that page. When a retailer blocks the
        scrape, we leave the price blank. We do not type a number from memory or from someone
        else&apos;s tweet.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-950">Skip rules</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-relaxed text-slate-600">
        <li>No product ID we can point at (ASIN, TCIN, SKU, or the equivalent).</li>
        <li>A price we cannot confirm in a cart, or a total that only exists in a graphic.</li>
        <li>A lifestyle photo we would have to invent because the listing would not give us one.</li>
        <li>A stack we cannot name layer by layer. “It came out cheaper for me” is not a post.</li>
        <li>Expired community consensus. If readers already marked it dead, we do not revive it on vibes.</li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold text-slate-950">Verify in the cart</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        The listing price is a hint. The cart is the check. Before we publish, we want the item in
        a cart (or as close as the store will let a guest get), shipping or pickup chosen, and any
        on-page coupon clipped. If the total moves, the card says so in the third bullet.
      </p>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Amazon is a special case on this site. Until we have a live Amazon price API, we do not
        present a typed number as Amazon&apos;s current price. The card says to see the price at
        Amazon. That is slower. It is also honest.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-950">What you do after we post</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Vote Alive if the cart still matches. Vote Expired if it does not. Leave a comment with the
        ZIP, the pickup store, or the code that actually fired. We would rather a card look ugly
        and true than polished and a day late.
      </p>
      <p className="mt-8 text-sm text-slate-500">
        <Link href="/learn" className="font-medium text-emerald-700 hover:underline">
          All Learn pages
        </Link>
        {" · "}
        <Link href="/learn/how-stacking-works" className="font-medium text-emerald-700 hover:underline">
          How stacking works
        </Link>
      </p>
    </article>
    </EditorialShell>
  );
}
