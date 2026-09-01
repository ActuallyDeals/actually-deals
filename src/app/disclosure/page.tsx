import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AMAZON_ASSOCIATE_DISCLOSURE } from "@/lib/disclosures";

export const metadata = {
  title: "Affiliate disclosure",
  description: "How Actually Deals is compensated for affiliate links.",
};

export default function DisclosurePage() {
  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Affiliate disclosure</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          Some links are affiliate links. If you buy after clicking, we may earn a commission. The
          price you pay does not change. Confirm the total at checkout; deals die fast.
        </p>
        <p className="mt-4 text-base leading-relaxed text-slate-600">{AMAZON_ASSOCIATE_DISCLOSURE}</p>
        <p className="mt-4 text-base leading-relaxed text-slate-600">
          This site is independent. We are not Amazon, Walmart, Target, Home Depot, or Best Buy.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
