import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Affiliate disclosure",
};

export default function DisclosurePage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-black text-slate-900">Affiliate disclosure</h1>
      <p className="mt-4 text-slate-600 leading-7">
        Actually Deals is a participant in the Amazon Services LLC Associates Program and other
        affiliate networks. If you click a Get Deal button and buy, we may earn a commission. You
        do not pay extra.
      </p>
      <p className="mt-4 text-slate-600 leading-7">
        We do not invent sale prices. If a retailer page cannot be read, the price stays blank until
        it is typed from the live checkout screen. Always confirm tax, shipping, and any coupon
        before you pay.
      </p>
    </article>
  );
}
