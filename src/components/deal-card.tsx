import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { CopyCodeButton } from "@/components/copy-code-button";
import { DealImage } from "@/components/deal-image";
import { formatRelativeTime, formatUsd } from "@/lib/format";
import { merchantLabel } from "@/lib/merchants";
import { AMAZON_ASSOCIATE_DISCLOSURE, GENERIC_AFFILIATE_DISCLOSURE } from "@/lib/disclosures";
import { dealHasProductLink, isCouponOnlyDeal } from "@/lib/outbound";
import { publicPriceDisplay } from "@/lib/pricing";
import { isDeadListing, type Deal } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DealCard({
  deal,
  variant = "feed",
}: {
  deal: Deal;
  variant?: "feed" | "preview";
}) {
  const staffPreview = variant === "preview";
  const price = publicPriceDisplay(deal, { staffPreview });
  const dead = isDeadListing(deal);
  const detailHref = `/deal/${deal.slug}`;
  const productLink = dealHasProductLink(deal);
  const couponOnly = isCouponOnlyDeal(deal);

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-200 bg-white",
        variant === "feed" && "cursor-pointer",
        dead && "grayscale opacity-60",
      )}
    >
      {variant === "feed" ? (
        <Link
          href={detailHref}
          className="absolute inset-0 z-0"
          aria-label={deal.title}
        />
      ) : null}

      <div className="pointer-events-none relative z-10 flex flex-col gap-4 p-4 sm:flex-row sm:gap-5 sm:p-5">
        <div className="pointer-events-none relative mx-auto aspect-square w-36 shrink-0 overflow-hidden rounded-lg bg-white sm:mx-0 sm:w-40">
          <DealImage deal={deal} className="h-full w-full object-contain p-2" />
          {deal.isPriceMistake ? (
            <span className="absolute top-2 left-2 rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-sm">
              Price Mistake
            </span>
          ) : deal.isStackingHack ? (
            <span className="absolute top-2 left-2 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase shadow-sm">
              Coupon Stack
            </span>
          ) : null}
          {dead ? (
            <span className="absolute right-2 bottom-2 rounded-md bg-slate-900/85 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
              Dead
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="pointer-events-none text-xs text-slate-500">
            {merchantLabel(deal.merchant, deal.sourceUrl || deal.affiliateUrl)}
            {deal.publishedAt ? ` · ${formatRelativeTime(deal.publishedAt)}` : " · Preview"}
            {price.percent ? ` · ${price.percent}% off` : ""}
          </p>

          <h2 className="pointer-events-none mt-1.5 text-lg leading-snug font-semibold text-slate-950 sm:text-xl">
            {deal.title}
          </h2>

          <div className="pointer-events-none mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            {price.headline ? (
              <p className="text-xl font-bold text-emerald-700">{price.headline}</p>
            ) : (
              <p className="text-xl font-bold text-emerald-700">{formatUsd(deal.currentPrice)}</p>
            )}
            {price.listPrice ? (
              <p className="text-sm text-slate-400 line-through">{formatUsd(price.listPrice)}</p>
            ) : null}
          </div>

          <ul className="pointer-events-none mt-2.5 space-y-1 text-sm leading-relaxed text-slate-600">
            {deal.bullets.slice(0, 3).map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>

          <div className="relative z-20 mt-4 flex flex-col gap-2 sm:flex-row pointer-events-auto">
            {deal.promoCode ? <CopyCodeButton code={deal.promoCode} className="sm:flex-1" /> : null}
            {productLink ? (
              <a
                href={deal.affiliateUrl}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                className={cn(
                  "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700",
                  !deal.promoCode && "w-full",
                )}
              >
                Get Deal
                <ExternalLink className="size-4" />
              </a>
            ) : couponOnly ? null : (
              <span
                className={cn(
                  "inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-slate-200 px-4 text-sm font-bold text-slate-500",
                  !deal.promoCode && "w-full",
                )}
              >
                No product link
              </span>
            )}
          </div>
          {couponOnly ? null : (
            <p className="pointer-events-none mt-3 text-[11px] text-slate-400">
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
    </article>
  );
}
