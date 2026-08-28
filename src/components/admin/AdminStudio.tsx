"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DealCard } from "@/components/deals/DealCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/deals/CopyButton";
import { slugify } from "@/lib/deal-ingest";
import { computeDiscountPercent, parseMoney } from "@/lib/money";
import {
  draftToDeal,
  emptyDraft,
  publishDeal,
  socialFromDraft,
} from "@/lib/store";
import type { DealCategory, DealDraft, ParsedDealPackage } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: DealCategory; label: string }[] = [
  { id: "amazon-finds", label: "Amazon Finds" },
  { id: "tech", label: "Tech" },
  { id: "home", label: "Home" },
  { id: "apparel", label: "Apparel" },
  { id: "price-errors", label: "Price Errors" },
  { id: "freebies", label: "Freebies" },
  { id: "general", label: "General" },
];

function packageToDraft(parsed: ParsedDealPackage): DealDraft {
  return {
    title: parsed.headline,
    slug: slugify(parsed.title) || `deal-${Date.now()}`,
    merchantName: parsed.merchantName,
    dealUrl: parsed.canonicalUrl,
    imageUrl: parsed.imageUrl,
    dealPrice: parsed.dealPrice === null ? "" : String(parsed.dealPrice),
    msrp: parsed.msrp === null ? "" : String(parsed.msrp),
    couponCode: parsed.couponCode ?? "",
    category: parsed.merchantSlug === "amazon" ? "amazon-finds" : "general",
    isPriceError: false,
    isStackingHack: false,
    isFeatured: false,
    socialPost: parsed.socialPost,
  };
}

export function AdminStudio() {
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<DealDraft>(emptyDraft);
  const [parsing, setParsing] = useState(false);
  const [priceBlocked, setPriceBlocked] = useState(false);
  const [scrapeNote, setScrapeNote] = useState<string | null>(null);

  const previewDeal = useMemo(() => draftToDeal(draft), [draft]);
  const discount = computeDiscountPercent(
    parseMoney(draft.dealPrice),
    parseMoney(draft.msrp),
  );
  const tweet = draft.socialPost || socialFromDraft(draft);

  function patch(partial: Partial<DealDraft>) {
    setDraft((current) => {
      const next = { ...current, ...partial };
      if (!partial.socialPost) {
        next.socialPost = socialFromDraft(next);
      }
      if (partial.title && !partial.slug) {
        next.slug = slugify(partial.title);
      }
      return next;
    });
  }

  async function parseUrl() {
    if (!url.trim()) {
      toast.error("Paste a product URL first.");
      return;
    }

    setParsing(true);
    try {
      const response = await fetch("/api/parse-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = (await response.json()) as ParsedDealPackage & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not parse that URL.");
      }

      setDraft(packageToDraft(payload));
      setPriceBlocked(payload.pricesBlocked || payload.dealPrice === null);
      setScrapeNote(payload.scrapeNote);
      if (payload.pricesBlocked || payload.dealPrice === null) {
        toast.warning("Title and image came through. Type the live price yourself.");
      } else {
        toast.success("Deal package generated");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Parser failed.");
    } finally {
      setParsing(false);
    }
  }

  function onPublish() {
    if (!draft.title.trim() || !draft.dealUrl.trim()) {
      toast.error("Need a title and a destination URL before publishing.");
      return;
    }
    if (!draft.dealPrice.trim()) {
      toast.error("Type the live deal price. The desk will not invent one.");
      return;
    }

    const deal = publishDeal(draftToDeal({ ...draft, socialPost: tweet }));
    toast.success(`Published ${deal.slug}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Publishing desk
        </p>
        <h1 className="mt-1 text-3xl font-black text-slate-900">1-paste deal studio</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Paste a retailer URL. The parser cleans tracking junk and tries Open Graph. If Amazon,
          Walmart, or anyone else blocks the scrape, price and MSRP stay empty on purpose.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="🔗 Paste product URL"
          className="h-12 flex-1 bg-white text-base"
        />
        <Button
          type="button"
          onClick={parseUrl}
          disabled={parsing}
          className="h-12 bg-slate-900 px-5 text-white hover:bg-slate-800"
        >
          {parsing ? "Reading listing…" : "⚡ Auto-Generate Deal Package"}
        </Button>
      </div>

      {scrapeNote ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {scrapeNote}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <Field label="Clean title">
            <Input
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
              className="h-10 bg-white"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Deal price"
              highlight={priceBlocked && !draft.dealPrice}
            >
              <Input
                value={draft.dealPrice}
                onChange={(event) => patch({ dealPrice: event.target.value })}
                placeholder="Type the live checkout price"
                className={cn(
                  "h-10 bg-white",
                  priceBlocked && !draft.dealPrice && "border-amber-400 ring-2 ring-amber-200",
                )}
              />
            </Field>
            <Field label="MSRP" highlight={priceBlocked && !draft.msrp}>
              <Input
                value={draft.msrp}
                onChange={(event) => patch({ msrp: event.target.value })}
                placeholder="Leave blank if unknown"
                className={cn(
                  "h-10 bg-white",
                  priceBlocked && !draft.msrp && "border-amber-400 ring-2 ring-amber-200",
                )}
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            Discount {discount === null ? "calculates after both prices are typed" : `${discount}%`}
          </p>
          <Field label="Image URL">
            <Input
              value={draft.imageUrl}
              onChange={(event) => patch({ imageUrl: event.target.value })}
              className="h-10 bg-white"
            />
          </Field>
          <Field label="Promo code">
            <Input
              value={draft.couponCode}
              onChange={(event) => patch({ couponCode: event.target.value })}
              className="h-10 bg-white"
            />
          </Field>
          <Field label="Merchant">
            <Input
              value={draft.merchantName}
              onChange={(event) => patch({ merchantName: event.target.value })}
              className="h-10 bg-white"
            />
          </Field>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-800">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => patch({ category: category.id })}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    draft.category === category.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-xl bg-slate-50 p-3">
            <Toggle
              label="🚨 Mark as Price Mistake"
              checked={draft.isPriceError}
              onCheckedChange={(checked) =>
                patch({
                  isPriceError: checked,
                  category: checked ? "price-errors" : draft.category,
                })
              }
            />
            <Toggle
              label="⚡ Stacking Hack"
              checked={draft.isStackingHack}
              onCheckedChange={(checked) => patch({ isStackingHack: checked })}
            />
            <Toggle
              label="⭐ Feature on Homepage"
              checked={draft.isFeatured}
              onCheckedChange={(checked) => patch({ isFeatured: checked })}
            />
          </div>
          <Button
            type="button"
            onClick={onPublish}
            className="h-12 w-full bg-emerald-600 text-white hover:bg-emerald-700"
          >
            🚀 Approve & Publish Deal
          </Button>
        </form>

        <div className="space-y-4">
          <DealCard deal={previewDeal} compact trackClicks={false} />
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-slate-900">X / Twitter post</h2>
              <span
                className={cn(
                  "text-xs font-bold",
                  tweet.length > 280 ? "text-red-600" : "text-slate-400",
                )}
              >
                {tweet.length}/280
              </span>
            </div>
            <Textarea
              value={tweet}
              onChange={(event) => patch({ socialPost: event.target.value })}
              className="mt-3 min-h-36 bg-white"
            />
            <div className="mt-3">
              <CopyButton value={tweet} label="Copy Tweet" className="px-3 py-1.5 text-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  highlight = false,
}: {
  label: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(highlight && "text-amber-700")}>
        {label}
        {highlight ? " — type this now" : null}
      </Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
      {label}
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
