import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "About",
  description: "What Actually Deals is, what we skip, and how the feed stays honest.",
};

export default function AboutPage() {
  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">About Actually Deals</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Actually Deals is a human-edited shopping feed. An editor pastes a product URL, writes
          three bullets, and publishes. You vote Alive or Expired and leave field reports so the
          next person is not chasing a dead total.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          We cover Amazon, Walmart, Target, Home Depot, and Best Buy when we can name the SKU and
          open the listing. We do not invent a sale price or an MSRP when a retailer hides the
          number. We do not turn a homepage into a Get Deal button.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          A Price Mistake badge is our judgment that the listing looks wrongly cheap, not a
          tracker and not a promise the store will honor it. Confirm the cart. If it does not
          match, vote Expired.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Compensation for outbound clicks is on the{" "}
          <Link href="/disclosure" className="font-medium text-emerald-700 hover:underline">
            disclosure
          </Link>{" "}
          page, not here.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
