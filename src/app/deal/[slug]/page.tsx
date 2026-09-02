import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CommentThread } from "@/components/comment-thread";
import { CopyCodeButton } from "@/components/copy-code-button";
import { DealEditorial } from "@/components/deal-editorial";
import { DealImage } from "@/components/deal-image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { VoteWidget } from "@/components/vote-widget";
import { originalWhyNote } from "@/lib/editorial";
import { formatRelativeTime, formatUsd } from "@/lib/format";
import { isBrandedPlaceholder, isUsableImageUrl, resolveDealImage } from "@/lib/images";
import { merchantLabel } from "@/lib/merchants";
import { dealHasProductLink, isCouponOnlyDeal } from "@/lib/outbound";
import { publicPriceDisplay } from "@/lib/pricing";
import { getDealBySlug, getMyVote, listComments } from "@/lib/store";
import { AMAZON_ASSOCIATE_DISCLOSURE, GENERIC_AFFILIATE_DISCLOSURE } from "@/lib/disclosures";
import { isCommunityExpired, type Deal } from "@/lib/types";
import { getVoterKey } from "@/lib/voter";

export const dynamic = "force-dynamic";

function dealPageUrl(slug: string): string {
  return `https://actuallydeals.com/deal/${slug}`;
}

function resolvedDealPhoto(
  deal: Pick<Deal, "scrapedImageUrl" | "imageUrl" | "merchant" | "merchantProductId">,
): string | null {
  const { imageUrl } = resolveDealImage({
    scrapedImageUrl: deal.scrapedImageUrl ?? deal.imageUrl,
    merchant: deal.merchant,
    merchantProductId: deal.merchantProductId,
  });
  if (isBrandedPlaceholder(imageUrl)) return null;
  if (!/^https?:\/\//i.test(imageUrl)) return null;
  if (!isUsableImageUrl(imageUrl)) return null;
  return imageUrl;
}

function productJsonLd(deal: Deal, slug: string) {
  const canonical = dealPageUrl(slug);
  const image = resolvedDealPhoto(deal);
  const outbound = deal.affiliateUrl?.trim() || deal.sourceUrl?.trim() || "";
  const offerUrl = isCouponOnlyDeal(deal) || !outbound ? canonical : outbound;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.title,
    url: canonical,
    brand: {
      "@type": "Brand",
      name: merchantLabel(deal.merchant, deal.sourceUrl || deal.affiliateUrl),
    },
    offers: {
      "@type": "Offer",
      url: offerUrl,
      price: deal.currentPrice,
      priceCurrency: "USD",
      availability:
        deal.status === "expired" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      seller: {
        "@type": "Organization",
        name: merchantLabel(deal.merchant, deal.sourceUrl || deal.affiliateUrl),
      },
    },
  };
  if (image) jsonLd.image = image;
  return jsonLd;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const deal = await getDealBySlug(slug);
  if (!deal || deal.status !== "published") return { title: "Deal not found · Actually Deals" };

  const title = `${deal.title} · Actually Deals`;
  const description = originalWhyNote(deal.summary) ?? deal.bullets[0];
  const imageUrl = resolvedDealPhoto(deal);
  const metadata: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      url: dealPageUrl(slug),
    },
  };
  if (imageUrl) {
    const images = [{ url: imageUrl, alt: deal.title, width: 1200, height: 1200 }];
    metadata.openGraph = { ...metadata.openGraph, images };
    metadata.twitter = { card: "summary_large_image", images };
  }
  return metadata;
}

export default async function DealPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const deal = await getDealBySlug(slug);
  if (!deal || deal.status !== "published") notFound();

  const [comments, voter] = await Promise.all([listComments(deal.id), getVoterKey()]);
  const myVote = await getMyVote(deal.id, voter.key);
  const expired = isCommunityExpired(deal);
  const price = publicPriceDisplay(deal);
  const productLink = dealHasProductLink(deal);
  const couponOnly = isCouponOnlyDeal(deal);

  return (
    <div className="flex min-h-full flex-col bg-slate-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd(deal, slug)) }}
      />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          ← Back to the feed
        </Link>

        {expired ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            The community has marked this deal expired. The outbound link is still here if you want
            to double-check the merchant.
          </div>
        ) : null}

        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <article className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-6 md:flex-row">
              <div className="relative mx-auto aspect-square w-56 shrink-0 overflow-hidden rounded-lg bg-white md:mx-0">
                <DealImage deal={deal} className="h-full w-full object-contain p-3" />
                {deal.isPriceMistake ? (
                  <span className="absolute top-3 left-3 rounded-md bg-red-600 px-2 py-1 text-[11px] font-bold tracking-wider text-white uppercase">
                    Price Mistake
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-500">
                  {merchantLabel(deal.merchant, deal.sourceUrl || deal.affiliateUrl)}
                  {deal.publishedAt ? ` · ${formatRelativeTime(deal.publishedAt)}` : ""}
                  {price.percent ? ` · ${price.percent}% off` : ""}
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {deal.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {price.headline ? (
                    <p className="text-2xl font-bold text-emerald-700 sm:text-3xl">{price.headline}</p>
                  ) : (
                    <p className="text-2xl font-bold text-emerald-700 sm:text-3xl">
                      {formatUsd(deal.currentPrice)}
                    </p>
                  )}
                  {price.listPrice ? (
                    <p className="text-base text-slate-400 line-through">{formatUsd(price.listPrice)}</p>
                  ) : null}
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  {deal.promoCode ? <CopyCodeButton code={deal.promoCode} /> : null}
                  {productLink ? (
                    <a
                      href={deal.affiliateUrl}
                      target="_blank"
                      rel="nofollow sponsored noopener noreferrer"
                      className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
                    >
                      Get Deal at {merchantLabel(deal.merchant, deal.sourceUrl || deal.affiliateUrl)}
                    </a>
                  ) : couponOnly ? null : (
                    <span className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-slate-200 text-sm font-bold text-slate-500">
                      No product link
                    </span>
                  )}
                </div>
                {couponOnly ? null : (
                  <p className="mt-3 text-[11px] text-slate-400">
                    {GENERIC_AFFILIATE_DISCLOSURE}
                    {deal.merchant === "amazon" ? (
                      <>
                        <br />
                        {AMAZON_ASSOCIATE_DISCLOSURE}
                      </>
                    ) : null}
                  </p>
                )}
              </div>
            </div>

            <ul className="mt-6 space-y-2 text-base leading-relaxed text-slate-700">
              {deal.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>

            <DealEditorial deal={deal} />
          </article>

          <div className="space-y-4">
            <VoteWidget
              slug={deal.slug}
              aliveVotes={deal.aliveVotes}
              expiredVotes={deal.expiredVotes}
              initialVote={myVote}
            />
            <CommentThread slug={deal.slug} initialComments={comments} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
