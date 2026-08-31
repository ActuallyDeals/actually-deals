import type { Metadata } from "next";
import Link from "next/link";
import { EditorialShell } from "@/components/editorial-shell";

export const metadata: Metadata = {
  title: "How stacking works",
  description: "Named discount layers, and why Actually Deals never assumes two offers stack.",
};

export default function HowStackingWorksPage() {
  return (
    <EditorialShell>
    <article>
      <p className="text-xs font-bold tracking-[0.18em] text-emerald-700 uppercase">Learn</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">How stacking works</h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        A stack is not a vibe. It is a short list of named layers that we actually saw apply, in
        order, on one cart. If we cannot name the layer, we do not write it on the card.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-950">The layers we name</h2>
      <ol className="mt-3 list-decimal space-y-3 pl-5 text-base leading-relaxed text-slate-600">
        <li>
          <span className="font-semibold text-slate-800">Street or list.</span> What the store was
          asking yesterday, if we can see it on the page. We do not invent an MSRP to make the
          percent look bigger.
        </li>
        <li>
          <span className="font-semibold text-slate-800">Instant markdown.</span> The number that
          changed on the listing itself, before any code.
        </li>
        <li>
          <span className="font-semibold text-slate-800">On-page coupon.</span> The clip or toggle
          that lives on the product page. If you have to hunt a leak site for it, we say so or we
          skip it.
        </li>
        <li>
          <span className="font-semibold text-slate-800">Promo code.</span> A typed string at
          checkout. The card&apos;s Copy Code button is for this layer only.
        </li>
        <li>
          <span className="font-semibold text-slate-800">Tender or membership.</span> Circle, Plus,
          a store card, or a payment offer. These fail silently for guests. We say who they apply
          to.
        </li>
        <li>
          <span className="font-semibold text-slate-800">Fulfillment.</span> Free pickup versus
          paid ship. A cheap item that only pencils out with pickup is a pickup deal.
        </li>
      </ol>

      <h2 className="mt-10 text-xl font-semibold text-slate-950">Never assume a stack</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Two yellow banners on the same page do not mean both will fire. Stores exclude codes from
        already-cut items, block stacking with gift cards, and drop a layer when the cart crosses
        a quantity limit. We write the path we walked. If your cart skips a layer, that is a field
        report, not a fight with the card.
      </p>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Order matters. Clip the on-page coupon before you enter a code. Sign in before you expect
        a membership price. If the third bullet says “confirm the total,” that is the instruction,
        not filler.
      </p>

      <h2 className="mt-10 text-xl font-semibold text-slate-950">When a layer dies</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">
        Vote Expired if the named stack no longer produces the named total. Do not keep a dead
        code in the comments as if it were still live. A new post is cheaper than a zombie card.
      </p>
      <p className="mt-8 text-sm text-slate-500">
        <Link href="/learn" className="font-medium text-emerald-700 hover:underline">
          All Learn pages
        </Link>
        {" · "}
        <Link href="/learn/how-we-pick" className="font-medium text-emerald-700 hover:underline">
          How we pick a deal
        </Link>
      </p>
    </article>
    </EditorialShell>
  );
}
