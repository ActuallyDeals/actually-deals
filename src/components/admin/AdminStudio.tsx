"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { DealCard } from "@/components/deals/DealCard";
import { CopyButton } from "@/components/deals/CopyButton";
import {
  previewFromUrl,
  slugify,
} from "@/lib/deal-ingest";
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
  { id: "amazon-finds", label: "Amazon" },
  { id: "tech", label: "Tech" },
  { id: "home", label: "Home" },
  { id: "apparel", label: "Apparel" },
  { id: "price-errors", label: "Price Drops" },
  { id: "freebies", label: "Freebies" },
  { id: "general", label: "General" },
];

function packageToDraft(parsed: ParsedDealPackage): DealDraft {
  return {
    title: parsed.title,
    slug: slugify(parsed.title) || `deal-${Date.now()}`,
    merchantName: parsed.merchantName,
    dealUrl: parsed.cleanedUrl || parsed.canonicalUrl,
    imageUrl: parsed.imageUrl,
    dealPrice: parsed.dealPrice === null ? "" : String(parsed.dealPrice),
    msrp: parsed.msrp === null ? "" : String(parsed.msrp),
    couponCode: parsed.couponCode ?? "",
    category: parsed.merchantSlug === "amazon" ? "amazon-finds" : "general",
    isPriceError: false,
    isStackingHack: Boolean(parsed.couponCode),
    isFeatured: false,
    socialPost: parsed.socialPost,
  };
}

function instantDraft(rawUrl: string): DealDraft | null {
  if (!/^https?:\/\//i.test(rawUrl.trim())) {
    return null;
  }
  const preview = previewFromUrl(rawUrl);
  return {
    ...emptyDraft(),
    title: preview.title,
    slug: slugify(preview.title) || "new-deal",
    merchantName: preview.merchantName,
    dealUrl: preview.cleanedUrl,
    imageUrl: preview.imageUrl,
    category: preview.merchantSlug === "amazon" ? "amazon-finds" : "general",
  };
}

export function AdminStudio() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<DealDraft>(emptyDraft);
  const [parsing, setParsing] = useState(false);
  const lastParsed = useRef("");

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

  async function parseUrl(raw = url) {
    const nextUrl = raw.trim();
    if (!nextUrl) {
      toast.error("Paste a product link first.");
      return;
    }

    const instant = instantDraft(nextUrl);
    if (instant) {
      setDraft(instant);
    }

    setParsing(true);
    lastParsed.current = nextUrl;
    try {
      const response = await fetch("/api/parse-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: nextUrl }),
      });
      const payload = (await response.json()) as ParsedDealPackage & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Could not read that link.");
      }
      setDraft(packageToDraft(payload));
      toast.success("Deal filled in from the listing");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not read that link.");
    } finally {
      setParsing(false);
    }
  }

  function onUrlChange(value: string) {
    setUrl(value);
    const instant = instantDraft(value);
    if (instant) {
      setDraft(instant);
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").trim();
    if (/^https?:\/\//i.test(pasted) && pasted !== lastParsed.current) {
      window.setTimeout(() => {
        void parseUrl(pasted);
      }, 0);
    }
  }

  function onPublish() {
    const next = {
      ...draft,
      dealUrl: draft.dealUrl.trim() || url.trim(),
      title: draft.title.trim(),
      socialPost: tweet,
    };
    if (!next.dealUrl) {
      toast.error("Paste a product link first.");
      return;
    }
    if (!next.title) {
      toast.error("Add a short product title.");
      return;
    }

    const deal = publishDeal(draftToDeal(next));
    toast.success("Deal posted");
    router.push(`/deal/${deal.slug}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Post a Deal</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Paste a product link. We pull the store, photo, title, and price — then you hit Post.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
        <input
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          onPaste={onPaste}
          onBlur={() => {
            if (url.trim() && url.trim() !== lastParsed.current) {
              void parseUrl();
            }
          }}
          placeholder="Paste Amazon, Walmart, Target, or any product link"
          className="h-12 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="button"
          onClick={() => void parseUrl()}
          disabled={parsing}
          className="h-12 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {parsing ? "Reading listing…" : "Fill from link"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Field label="Title">
            <input
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Price">
              <input
                value={draft.dealPrice}
                onChange={(event) => patch({ dealPrice: event.target.value })}
                placeholder="9.11"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
              />
            </Field>
            <Field label="Was">
              <input
                value={draft.msrp}
                onChange={(event) => patch({ msrp: event.target.value })}
                placeholder="36"
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
              />
            </Field>
          </div>
          {discount ? (
            <p className="text-xs font-bold text-emerald-700">{discount}% off</p>
          ) : null}
          <Field label="Image URL">
            <input
              value={draft.imageUrl}
              onChange={(event) => patch({ imageUrl: event.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Promo code">
              <input
                value={draft.couponCode}
                onChange={(event) => patch({ couponCode: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
              />
            </Field>
            <Field label="Store">
              <input
                value={draft.merchantName}
                onChange={(event) => patch({ merchantName: event.target.value })}
                className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
              />
            </Field>
          </div>
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
          <label className="flex items-center justify-between text-sm font-semibold">
            Price error
            <input
              type="checkbox"
              checked={draft.isPriceError}
              onChange={(event) =>
                patch({
                  isPriceError: event.target.checked,
                  category: event.target.checked ? "price-errors" : draft.category,
                })
              }
            />
          </label>
          <label className="flex items-center justify-between text-sm font-semibold">
            Has a coupon stack
            <input
              type="checkbox"
              checked={draft.isStackingHack}
              onChange={(event) => patch({ isStackingHack: event.target.checked })}
            />
          </label>
          <button
            type="button"
            onClick={onPublish}
            className="h-12 w-full rounded-lg bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Post Deal
          </button>
        </div>

        <div className="space-y-4">
          <DealCard deal={previewDeal} compact trackClicks={false} />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Share post</h2>
              <span className={cn("text-xs font-bold", tweet.length > 280 ? "text-red-600" : "text-slate-400")}>
                {tweet.length}/280
              </span>
            </div>
            <textarea
              value={tweet}
              onChange={(event) => patch({ socialPost: event.target.value })}
              className="mt-3 min-h-32 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500"
            />
            <CopyButton value={tweet} label="Copy post" className="mt-3 px-3 py-1.5 text-xs" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}
