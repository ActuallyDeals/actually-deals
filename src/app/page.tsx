import { DealFeed } from "@/components/deal-feed";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listPublishedDeals } from "@/lib/store";
import { FEED_FILTERS, type FeedFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

function parseFilter(value: string | string[] | undefined): FeedFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return FEED_FILTERS.includes(raw as FeedFilter) ? (raw as FeedFilter) : "all";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const deals = await listPublishedDeals();

  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <DealFeed deals={deals} initialFilter={parseFilter(params.filter)} />
      </main>
      <SiteFooter />
    </div>
  );
}
