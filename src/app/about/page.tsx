import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "How Actually Deals finds and posts real markdowns.",
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-black text-slate-900">About Actually Deals</h1>
      <p className="mt-4 text-slate-600 leading-7">
        We post the prices we would actually buy. If a listing is a coupon stack, a clearance, or a
        genuine price error, it goes up with the steps to check out. If the total does not match,
        readers mark it expired.
      </p>
      <p className="mt-4 text-slate-600 leading-7">
        This is not a store. You buy at Amazon, Walmart, Macy&apos;s, Target, and the rest. We just
        find the cut and tell you how to get it.
      </p>
    </article>
  );
}
