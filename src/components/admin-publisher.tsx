"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DealCard } from "@/components/deal-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildDanBullets,
  buildFacebookPost,
  buildInstagramCaption,
  buildSocialPost,
  discountPercent,
  parseSocialDrafts,
  serializeSocialDrafts,
} from "@/lib/copy-engine";
import {
  inferStackFromTitle,
  productNameFromTitle,
  rewritePastedDeal,
  stackedBullets,
  stackedHeadline,
  stackedWhyNote,
} from "@/lib/stack-copy";
import { boxesToStackingSteps, staffWriteupBoxes, writeupReady } from "@/lib/editorial";
import { withHttps } from "@/lib/affiliate";
import { isBrandedPlaceholder, resolveDealImage } from "@/lib/images";
import { isAppCouponMerchant, isCouponOnlyDeal } from "@/lib/outbound";
import { MERCHANT_PROFILES } from "@/lib/merchants";
import { giftCardFaceValue } from "@/lib/pricing";
import { findDuplicateDeal } from "@/lib/desk";
import {
  DEAL_CATEGORIES,
  QUEUE_STAGES,
  type Deal,
  type DealCategory,
  type Merchant,
  type ParsedDeal,
  type PublishDealInput,
  type QueueStage,
  isDeadListing,
} from "@/lib/types";

const EMPTY_BULLETS = ["", "", ""];

interface Draft {
  sourceUrl: string;
  title: string;
  merchant: Merchant;
  merchantProductId: string;
  currentPrice: string;
  listPrice: string;
  promoCode: string;
  isPriceMistake: boolean;
  isStackingHack: boolean;
  clipCoupon: boolean;
  subscribeSave: boolean;
  pasteCopy: string;
  isFeatured: boolean;
  category: DealCategory;
  bullets: string[];
  socialPost: string;
  instagramPost: string;
  facebookPost: string;
  scrapeNote: string;
  pricesBlocked: boolean;
  summary: string;
  stackNote: string;
  verifyNote: string;
  scrapedImageUrl: string;
  imageUrl: string;
  affiliateUrl: string;
}

const emptyDraft: Draft = {
  sourceUrl: "",
  title: "",
  merchant: "other",
  merchantProductId: "",
  currentPrice: "",
  listPrice: "",
  promoCode: "",
  isPriceMistake: false,
  isStackingHack: false,
  clipCoupon: false,
  subscribeSave: false,
  pasteCopy: "",
  isFeatured: false,
  category: "general",
  bullets: [...EMPTY_BULLETS],
  socialPost: "",
  instagramPost: "",
  facebookPost: "",
  scrapeNote: "",
  pricesBlocked: false,
  summary: "",
  stackNote: "",
  verifyNote: "",
  scrapedImageUrl: "",
  imageUrl: "",
  affiliateUrl: "",
};

function priceNumber(value: string): number | null {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mergeListPrice(staffWas: string, parsedList: number | null, ...blobs: Array<string | null | undefined>): string {
  const face = parsedList ?? giftCardFaceValue(...blobs);
  const staff = priceNumber(staffWas);
  if (face == null) return staffWas;
  if (staff != null && staff > face) return staffWas;
  return String(face);
}

function deskNotice(title: string): string {
  return `Already on the desk: ${title}`;
}

function dealToDraft(deal: Deal): Draft {
  const writeup = staffWriteupBoxes(deal);
  const social = parseSocialDrafts(deal.socialPost);
  return {
    sourceUrl: deal.sourceUrl,
    title: deal.title,
    merchant: deal.merchant,
    merchantProductId: deal.merchantProductId ?? "",
    currentPrice: deal.currentPrice ? String(deal.currentPrice) : "",
    listPrice: deal.listPrice != null ? String(deal.listPrice) : "",
    promoCode: deal.promoCode ?? "",
    isPriceMistake: deal.isPriceMistake,
    isStackingHack: deal.isStackingHack,
    clipCoupon: inferStackFromTitle(deal.title).clipCoupon,
    subscribeSave: inferStackFromTitle(deal.title).subscribeSave,
    pasteCopy: "",
    isFeatured: deal.isFeatured,
    category: deal.category,
    bullets: [deal.bullets[0] ?? "", deal.bullets[1] ?? "", deal.bullets[2] ?? ""],
    socialPost: social.x,
    instagramPost: social.instagram,
    facebookPost: social.facebook,
    scrapeNote: "",
    pricesBlocked: !deal.currentPrice,
    summary: writeup.why,
    stackNote: writeup.stack,
    verifyNote: writeup.verify,
    scrapedImageUrl: deal.scrapedImageUrl ?? "",
    imageUrl: deal.imageUrl,
    affiliateUrl: deal.affiliateUrl,
  };
}

function draftToDeal(draft: Draft): Deal {
  const now = new Date().toISOString();
  return {
    id: "preview",
    slug: "preview",
    title: draft.title || "Untitled deal",
    merchant: draft.merchant,
    merchantProductId: draft.merchantProductId || null,
    sourceUrl: draft.sourceUrl,
    affiliateUrl: draft.affiliateUrl || draft.sourceUrl || "#",
    scrapedImageUrl: draft.scrapedImageUrl || null,
    imageUrl: draft.imageUrl || "/placeholders/other.svg",
    currentPrice: priceNumber(draft.currentPrice) ?? 0,
    listPrice: priceNumber(draft.listPrice),
    promoCode: draft.promoCode || null,
    isPriceMistake: draft.isPriceMistake,
    isStackingHack: draft.isStackingHack,
    isFeatured: draft.isFeatured,
    category: draft.category,
    bullets: draft.bullets.map((bullet) => bullet || "…"),
    stackingSteps: boxesToStackingSteps(draft.stackNote, draft.verifyNote),
    socialPost: draft.socialPost || null,
    summary: draft.summary.trim() || null,
    status: "published",
    queueStage: null,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    aliveVotes: 0,
    expiredVotes: 0,
    commentCount: 0,
  };
}

function payloadFromDeal(deal: Deal, status: Deal["status"]): PublishDealInput {
  return {
    title: deal.title,
    merchant: deal.merchant,
    merchantProductId: deal.merchantProductId,
    sourceUrl: deal.sourceUrl,
    affiliateUrl: deal.affiliateUrl,
    scrapedImageUrl: deal.scrapedImageUrl,
    imageUrl: deal.imageUrl,
    currentPrice: deal.currentPrice,
    listPrice: deal.listPrice,
    promoCode: deal.promoCode,
    isPriceMistake: deal.isPriceMistake,
    isStackingHack: deal.isStackingHack,
    isFeatured: deal.isFeatured,
    category: deal.category,
    bullets: deal.bullets,
    stackingSteps: deal.stackingSteps,
    socialPost: deal.socialPost,
    summary: deal.summary,
    status,
    queueStage: null,
  };
}

function looksLikeUrl(value: string): boolean {
  const candidate = withHttps(value);
  if (!candidate) return false;
  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".");
  } catch {
    return false;
  }
}

function SocialDraftBox({
  id,
  label,
  hint,
  value,
  copyMeta,
  copiedLabel,
  showUrlHint,
  onChange,
  onRebuild,
  onCopy,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  copyMeta: string;
  copiedLabel: string;
  showUrlHint: boolean;
  onChange: (value: string) => void;
  onRebuild: () => void;
  onCopy: () => Promise<void>;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label htmlFor={id}>{label}</Label>
          <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
            onClick={onRebuild}
          >
            Rebuild from notes
          </button>
          <button
            type="button"
            className="text-xs font-semibold text-emerald-700"
            disabled={!value.trim()}
            onClick={async () => {
              try {
                await onCopy();
                toast.success(copiedLabel);
              } catch {
                toast.error("Could not copy.");
              }
            }}
          >
            {copyMeta.startsWith("Copy") ? copyMeta : `Copy · ${copyMeta}`}
          </button>
        </div>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-28 font-mono text-sm"
      />
      {showUrlHint ? (
        <p className="text-xs text-slate-500">
          Deal page URL is added after the first Incoming / Draft / Ready save.
        </p>
      ) : null}
    </div>
  );
}

function applyStackToDraft(current: Draft, patch: Partial<Draft> = {}): Draft {
  const next: Draft = { ...current, ...patch };
  const live = priceNumber(next.currentPrice);
  const list = priceNumber(next.listPrice);
  const stacking = next.clipCoupon || next.subscribeSave || Boolean(next.promoCode.trim());
  next.isStackingHack = stacking;
  if (stacking) {
    next.title = stackedHeadline({
      title: next.title,
      merchant: next.merchant,
      currentPrice: live,
      clipCoupon: next.clipCoupon,
      subscribeSave: next.subscribeSave,
      promoCode: next.promoCode,
    });
    const generic =
      !current.bullets[0]?.trim() ||
      /do not guess|see the live price|clip the on-page|clip any on-page|subscribe & save|confirm the total|prime shipping|get deal|free store pickup/i.test(
        current.bullets.join(" "),
      );
    if (generic) {
      next.bullets = stackedBullets({
        merchant: next.merchant,
        currentPrice: live,
        listPrice: list,
        clipCoupon: next.clipCoupon,
        subscribeSave: next.subscribeSave,
        promoCode: next.promoCode,
      });
    }
  } else {
    next.title = productNameFromTitle(next.title);
  }
  return next;
}

export function AdminPublisher({
  persistence: _persistence,
  queued,
  live,
}: {
  persistence: "supabase" | "local";
  queued: Deal[];
  live: Deal[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueStage | "all">("all");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [imageTier, setImageTier] = useState<string | null>(null);
  const [xDraftLocked, setXDraftLocked] = useState(false);
  const [igDraftLocked, setIgDraftLocked] = useState(false);
  const [fbDraftLocked, setFbDraftLocked] = useState(false);
  const parsedUrls = useRef(new Set<string>());
  const urlRef = useRef<HTMLInputElement>(null);
  const whyRef = useRef<HTMLTextAreaElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => draftToDeal(draft), [draft]);
  const placeholderPhoto = isBrandedPlaceholder(draft.imageUrl);
  const couponOnly = isCouponOnlyDeal({
    promoCode: draft.promoCode,
    sourceUrl: draft.sourceUrl || url,
    merchant: draft.merchant,
  });
  const needsPrice = priceNumber(draft.currentPrice) == null;
  const listValue = priceNumber(draft.listPrice);
  const liveValue = priceNumber(draft.currentPrice);
  const needsList =
    !couponOnly &&
    (listValue == null || listValue <= 0 || (liveValue != null && listValue <= liveValue));
  const publishBlocked = couponOnly
    ? !draft.title.trim() || !draft.promoCode.trim()
    : needsPrice || needsList;
  const editingLive = Boolean(editingSlug && live.some((item) => item.slug === editingSlug));
  const needsPhoto = placeholderPhoto;
  const notesReady = writeupReady(draft.summary, draft.stackNote, draft.verifyNote);
  const canComposeSocial =
    Boolean(draft.title.trim()) && (couponOnly || priceNumber(draft.currentPrice) != null);

  function socialInput(from: Draft = draft, slug = editingSlug) {
    return {
      title: from.title,
      merchant: from.merchant,
      currentPrice: priceNumber(from.currentPrice),
      why: from.summary,
      stack: from.stackNote,
      verify: from.verifyNote,
      slug,
    };
  }

  function composeXDraft(from: Draft = draft, slug = editingSlug): string {
    return buildSocialPost(socialInput(from, slug));
  }

  function composeIgDraft(from: Draft = draft, slug = editingSlug): string {
    return buildInstagramCaption(socialInput(from, slug));
  }

  function composeFbDraft(from: Draft = draft, slug = editingSlug): string {
    return buildFacebookPost(socialInput(from, slug));
  }
  const counts = useMemo(() => {
    const next = { incoming: 0, draft: 0, ready: 0 };
    for (const item of queued) {
      if (item.queueStage) next[item.queueStage] += 1;
    }
    return next;
  }, [queued]);
  const visibleQueue = queued.filter((item) =>
    queueFilter === "all" ? true : item.queueStage === queueFilter,
  );

  function applyParsed(parsed: ParsedDeal) {
    const sameListing =
      draft.sourceUrl === parsed.sourceUrl || draft.sourceUrl === parsed.sourceUrl.split("?")[0];
    if (!sameListing) {
      setXDraftLocked(false);
      setIgDraftLocked(false);
      setFbDraftLocked(false);
    }
    const resolved = resolveDealImage({
      scrapedImageUrl: parsed.scrapedImageUrl,
      merchant: parsed.merchant,
      merchantProductId: parsed.merchantProductId,
    });
    const inferred = inferStackFromTitle(parsed.title);
    setDraft((current) => {
      const imageUrl = isBrandedPlaceholder(parsed.imageUrl)
        ? resolved.imageUrl
        : parsed.imageUrl || resolved.imageUrl;
      const next: Draft = {
        ...current,
        sourceUrl: parsed.sourceUrl,
        title: parsed.title || current.title,
        merchant: parsed.merchant,
        merchantProductId: parsed.merchantProductId ?? current.merchantProductId,
        currentPrice:
          parsed.currentPrice != null
            ? String(parsed.currentPrice)
            : current.currentPrice,
        listPrice: mergeListPrice(
          current.listPrice,
          parsed.listPrice,
          parsed.sourceUrl,
          parsed.title,
          current.sourceUrl,
          current.title,
        ),
        scrapedImageUrl:
          parsed.scrapedImageUrl ||
          (resolved.imageTier === "cdn" ? resolved.imageUrl : current.scrapedImageUrl),
        imageUrl,
        affiliateUrl: parsed.affiliateUrl || current.affiliateUrl,
        bullets: parsed.bullets?.length === 3 ? parsed.bullets : current.bullets,
        socialPost: sameListing ? current.socialPost : "",
        instagramPost: sameListing ? current.instagramPost : "",
        facebookPost: sameListing ? current.facebookPost : "",
        scrapeNote: parsed.scrapeNote ?? "",
        pricesBlocked: Boolean(parsed.pricesBlocked) && parsed.currentPrice == null,
        category: parsed.merchant === "amazon" ? "amazon-finds" : current.category,
        clipCoupon: inferred.clipCoupon || current.clipCoupon,
        subscribeSave: inferred.subscribeSave || current.subscribeSave,
      };
      return applyStackToDraft(next);
    });
    setImageTier(resolved.imageTier);
  }

  async function runParse(raw: string) {
    const target = withHttps(raw);
    if (!looksLikeUrl(target)) return;
    setParsing(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/parse-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const payload = (await response.json()) as {
        error?: string;
        deals?: ParsedDeal[];
        scrapeNote?: string | null;
        deskDuplicate?: { slug: string; title: string } | null;
      } & Partial<ParsedDeal>;
      if (!response.ok) throw new Error(payload.error || "Parse failed.");
      const deals =
        payload.deals && payload.deals.length > 0
          ? payload.deals
          : payload.sourceUrl
            ? [payload as ParsedDeal]
            : [];
      if (deals.length === 0) {
        const message = payload.scrapeNote || "No retailer product links found. Do not invent prices.";
        setError(message);
        toast.message(message);
        return;
      }
      if (deals.length > 1) {
        await parkRoundup(deals, payload.scrapeNote ?? null);
        return;
      }
      const parsed = deals[0]!;
      parsedUrls.current.add(target);
      parsedUrls.current.add(parsed.sourceUrl);
      if (document.activeElement !== urlRef.current) {
        setUrl(parsed.sourceUrl);
      }
      applyParsed(parsed);
      const duplicate =
        payload.deskDuplicate && payload.deskDuplicate.slug !== editingSlug
          ? payload.deskDuplicate
          : findDuplicateDeal([...queued, ...live], parsed.merchant, parsed.merchantProductId, editingSlug);
      if (duplicate) {
        const message = deskNotice(duplicate.title);
        setNotice(message);
        toast.message(message);
        if (parsed.currentPrice == null) {
          window.setTimeout(() => priceRef.current?.focus(), 0);
        }
      } else if (parsed.currentPrice == null) {
        const message =
          parsed.merchant === "amazon"
            ? "Amazon hid the price. Paste the live number."
            : "Paste the live price from the listing tab.";
        setNotice(message);
        toast.message(message);
        window.setTimeout(() => priceRef.current?.focus(), 0);
      } else {
        toast.success("Listing filled in");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Parse failed.";
      setError(message);
      toast.error(message);
    } finally {
      setParsing(false);
    }
  }

  useEffect(() => {
    const trimmed = url.trim();
    if (!looksLikeUrl(trimmed) || parsedUrls.current.has(trimmed)) return;
    const timer = window.setTimeout(() => {
      void runParse(trimmed);
    }, 450);
    return () => window.clearTimeout(timer);
    // runParse is stable enough for this desk; url is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (!canComposeSocial) return;
    const nextX = xDraftLocked ? "" : composeXDraft();
    const nextIg = igDraftLocked ? "" : composeIgDraft();
    const nextFb = fbDraftLocked ? "" : composeFbDraft();
    setDraft((current) => {
      const patch: Partial<Draft> = {};
      if (!xDraftLocked && nextX && current.socialPost !== nextX) patch.socialPost = nextX;
      if (!igDraftLocked && nextIg && current.instagramPost !== nextIg) patch.instagramPost = nextIg;
      if (!fbDraftLocked && nextFb && current.facebookPost !== nextFb) patch.facebookPost = nextFb;
      if (Object.keys(patch).length === 0) return current;
      return { ...current, ...patch };
    });
    // compose from our desk fields only; lock after staff types in a textarea
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canComposeSocial,
    xDraftLocked,
    igDraftLocked,
    fbDraftLocked,
    draft.title,
    draft.currentPrice,
    draft.merchant,
    draft.summary,
    draft.stackNote,
    draft.verifyNote,
    editingSlug,
  ]);

  function incomingFromParsed(parsed: ParsedDeal): PublishDealInput {
    return {
      title: parsed.title,
      merchant: parsed.merchant,
      merchantProductId: parsed.merchantProductId,
      sourceUrl: parsed.sourceUrl,
      affiliateUrl: parsed.affiliateUrl,
      scrapedImageUrl: parsed.scrapedImageUrl,
      imageUrl: parsed.imageUrl,
      currentPrice: parsed.currentPrice,
      listPrice: parsed.listPrice,
      promoCode: null,
      bullets: parsed.bullets?.length === 3 ? parsed.bullets : ["", "", ""],
      stackingSteps: [],
      socialPost: null,
      summary: null,
      status: "draft",
      queueStage: "incoming",
    };
  }

  async function parkRoundup(deals: ParsedDeal[], scrapeNote: string | null) {
    setSaving("incoming");
    setError(null);
    let parked = 0;
    try {
      for (const parsed of deals) {
        const response = await fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(incomingFromParsed(parsed)),
        });
        const payload = (await response.json()) as { error?: string; deal?: Deal };
        if (!response.ok || !payload.deal) throw new Error(payload.error || "Could not park a roundup item.");
        parked += 1;
      }
      const message = scrapeNote || `Parked ${parked} Incoming drafts from that roundup.`;
      toast.success(`Parked ${parked} Incoming drafts`);
      startNew();
      setNotice(message);
      router.refresh();
    } catch (err) {
      const message =
        parked > 0
          ? `Parked ${parked}, then failed: ${err instanceof Error ? err.message : "save failed."}`
          : err instanceof Error
            ? err.message
            : "Could not park roundup.";
      setError(message);
      toast.error(message);
      router.refresh();
    } finally {
      setSaving(null);
    }
  }

  function filledBullets(from: Draft = draft): string[] {
    const existing = from.bullets.map((bullet) => bullet.trim()).filter(Boolean);
    if (existing.length === 3) return from.bullets.map((bullet) => bullet.trim()).slice(0, 3);
    const pay = priceNumber(from.currentPrice);
    const list = priceNumber(from.listPrice);
    if (from.clipCoupon || from.subscribeSave || from.promoCode.trim()) {
      return stackedBullets({
        merchant: from.merchant,
        currentPrice: pay,
        listPrice: list,
        clipCoupon: from.clipCoupon,
        subscribeSave: from.subscribeSave,
        promoCode: from.promoCode,
      });
    }
    return buildDanBullets({
      merchant: from.merchant,
      currentPrice: pay,
      listPrice: list,
      percentOff: discountPercent(pay, list),
      promoCode: from.promoCode || null,
      sourceUrl: from.sourceUrl || url,
    });
  }

  function payloadFromDraft(status: Deal["status"], queueStage: QueueStage | null): PublishDealInput {
    return {
      title: draft.title,
      merchant: draft.merchant,
      merchantProductId: draft.merchantProductId || null,
      sourceUrl: draft.sourceUrl || url,
      affiliateUrl: draft.affiliateUrl,
      scrapedImageUrl: draft.scrapedImageUrl || null,
      imageUrl: draft.imageUrl,
      currentPrice: priceNumber(draft.currentPrice),
      listPrice: priceNumber(draft.listPrice),
      promoCode: draft.promoCode || null,
      isPriceMistake: draft.isPriceMistake,
      isStackingHack: draft.isStackingHack,
      isFeatured: draft.isFeatured,
      category: draft.category,
      bullets: filledBullets(),
      stackingSteps: boxesToStackingSteps(draft.stackNote, draft.verifyNote),
      socialPost:
        serializeSocialDrafts({
          x: draft.socialPost,
          instagram: draft.instagramPost,
          facebook: draft.facebookPost,
        }) || null,
      summary: draft.summary.trim() || null,
      status,
      queueStage,
    };
  }

  async function save(status: Deal["status"], queueStage: QueueStage | null, label: string) {
    if (queueStage === "ready" && !notesReady) {
      setError("Ready needs why / stack / verify. Incoming and Draft can stay blank.");
      whyRef.current?.focus();
      return;
    }
    if (status === "published") {
      const duplicate = findDuplicateDeal(
        [...queued, ...live],
        draft.merchant,
        draft.merchantProductId,
        editingSlug,
      );
      if (duplicate) {
        const message = deskNotice(duplicate.title);
        setError(message);
        toast.error(message);
        return;
      }
      const coupon = isCouponOnlyDeal({
        promoCode: draft.promoCode,
        sourceUrl: draft.sourceUrl || url,
        merchant: draft.merchant,
      });
      if (!draft.title.trim()) {
        setError("Title is required.");
        return;
      }
      if (coupon) {
        if (!draft.promoCode.trim()) {
          setError("Coupon posts need a code.");
          return;
        }
      } else {
        if (!(draft.sourceUrl || url).trim()) {
          setError("Paste a retailer URL or a coupon code.");
          return;
        }
        const pay = priceNumber(draft.currentPrice);
        const was = priceNumber(draft.listPrice);
        if (was == null || was <= 0) {
          setError("Was-price / list price is required to publish. Copy it from the listing.");
          return;
        }
        if (pay != null && was <= pay) {
          setError("List price cannot be the same as or lower than the deal price. Fix the was-price.");
          return;
        }
      }
    }
    setSaving(label);
    setError(null);
    setNotice(null);
    try {
      const body = payloadFromDraft(status, queueStage);
      const response = await fetch(editingSlug ? `/api/deals/${editingSlug}` : "/api/deals", {
        method: editingSlug ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        error?: string;
        deal?: Deal;
        socialError?: string;
        socialPosted?: string[];
      };
      if (!response.ok || !payload.deal) throw new Error(payload.error || "Save failed.");
      if (status === "published") {
        if (payload.socialError) {
          toast.error(payload.socialError);
          setError(payload.socialError);
          setNotice("Live on the site. Social auto-post failed.");
          setEditingSlug(payload.deal.slug);
          router.refresh();
        } else {
          const extra = payload.socialPosted?.length
            ? ` Posted to ${payload.socialPosted.join(", ")}.`
            : "";
          toast.success(editingLive ? "Live deal updated" : `Deal posted.${extra}`);
          if (editingLive) {
            setNotice(extra ? `Updated the live deal.${extra}` : "Updated the live deal.");
          } else {
            router.push(`/deal/${payload.deal.slug}`);
          }
        }
      } else {
        toast.success(`Saved to ${queueStage}`);
        setEditingSlug(payload.deal.slug);
        setNotice(`In ${queueStage}. Not on the public feed.`);
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(null);
    }
  }

  async function setLiveStatus(deal: Deal) {
    const nextStatus: Deal["status"] = deal.status === "expired" ? "published" : "expired";
    const label = `live:${deal.slug}`;
    setSaving(label);
    setError(null);
    try {
      const response = await fetch(`/api/deals/${deal.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromDeal(deal, nextStatus)),
      });
      const payload = (await response.json()) as { error?: string; deal?: Deal };
      if (!response.ok || !payload.deal) throw new Error(payload.error || "Save failed.");
      toast.success(nextStatus === "expired" ? "Marked Dead" : "Revived");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(null);
    }
  }

  function loadQueued(deal: Deal) {
    parsedUrls.current.add(deal.sourceUrl);
    setUrl(deal.sourceUrl);
    setDraft(dealToDraft(deal));
    setEditingSlug(deal.slug);
    setImageTier(isBrandedPlaceholder(deal.imageUrl) ? "placeholder" : "staff");
    const social = parseSocialDrafts(deal.socialPost);
    setXDraftLocked(Boolean(social.x.trim()));
    setIgDraftLocked(Boolean(social.instagram.trim()));
    setFbDraftLocked(Boolean(social.facebook.trim()));
    setError(null);
    const liveHit = deal.status === "published" || deal.status === "expired";
    setNotice(
      liveHit
        ? `Editing live deal${isDeadListing(deal) ? " (Dead)" : ""}. Save updates the public card.`
        : `Editing ${deal.queueStage} item.`,
    );
    window.setTimeout(() => {
      if (!deal.currentPrice) priceRef.current?.focus();
      else if (isBrandedPlaceholder(deal.imageUrl)) imageRef.current?.focus();
    }, 0);
  }

  function startNew() {
    parsedUrls.current = new Set();
    setUrl("");
    setDraft(emptyDraft);
    setEditingSlug(null);
    setImageTier(null);
    setXDraftLocked(false);
    setIgDraftLocked(false);
    setFbDraftLocked(false);
    setError(null);
    setNotice(null);
    window.setTimeout(() => urlRef.current?.focus(), 0);
  }

  function nextQueueStage(stage: QueueStage | null): QueueStage | null {
    if (stage === "incoming") return "draft";
    if (stage === "draft") return "ready";
    return null;
  }

  function dealToInput(deal: Deal, queueStage: QueueStage): PublishDealInput {
    return {
      title: deal.title,
      merchant: deal.merchant,
      merchantProductId: deal.merchantProductId,
      sourceUrl: deal.sourceUrl,
      affiliateUrl: deal.affiliateUrl,
      scrapedImageUrl: deal.scrapedImageUrl,
      imageUrl: deal.imageUrl,
      currentPrice: deal.currentPrice || null,
      listPrice: deal.listPrice,
      promoCode: deal.promoCode,
      isPriceMistake: deal.isPriceMistake,
      isStackingHack: deal.isStackingHack,
      isFeatured: deal.isFeatured,
      category: deal.category,
      bullets: deal.bullets,
      stackingSteps: deal.stackingSteps,
      socialPost: deal.socialPost,
      summary: deal.summary,
      status: "draft",
      queueStage,
    };
  }

  async function moveQueued(item: Deal, stage: QueueStage, event: React.MouseEvent) {
    event.stopPropagation();
    if (stage === "ready") {
      const boxes = staffWriteupBoxes(item);
      if (!writeupReady(boxes.why, boxes.stack, boxes.verify)) {
        loadQueued(item);
        setError("Ready needs why / stack / verify. Write them, then mark Ready.");
        window.setTimeout(() => whyRef.current?.focus(), 0);
        return;
      }
    }
    setSaving(`move-${item.slug}-${stage}`);
    try {
      const response = await fetch(`/api/deals/${item.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealToInput(item, stage)),
      });
      const payload = (await response.json()) as { error?: string; deal?: Deal };
      if (!response.ok || !payload.deal) throw new Error(payload.error || "Could not move item.");
      if (editingSlug === item.slug) setNotice(`Moved to ${stage}.`);
      toast.success(`Moved to ${stage}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not move item.");
    } finally {
      setSaving(null);
    }
  }

  function applyStaffPrice(field: "currentPrice" | "listPrice", value: string) {
    setDraft((current) => {
      const next = applyStackToDraft(current, {
        [field]: value,
        pricesBlocked: field === "currentPrice" ? priceNumber(value) == null : current.pricesBlocked,
      });
      const pay = priceNumber(next.currentPrice);
      if (priceNumber(next.listPrice) == null) {
        next.listPrice = mergeListPrice(next.listPrice, null, next.sourceUrl, next.title, url);
      }
      const list = priceNumber(next.listPrice);
      const genericBullet =
        !current.bullets[0] ||
        /do not guess|see the live price/i.test(current.bullets[0]);
      if (pay != null && genericBullet && !next.clipCoupon && !next.subscribeSave) {
        next.bullets = buildDanBullets({
          merchant: next.merchant,
          currentPrice: pay,
          listPrice: list,
          percentOff: discountPercent(pay, list),
          promoCode: next.promoCode || null,
          sourceUrl: next.sourceUrl || url,
        });
      }
      return next;
    });
  }

  function applyPastedRewrite() {
    const rewritten = rewritePastedDeal(draft.pasteCopy, {
      title: draft.title,
      merchant: draft.merchant,
      currentPrice: draft.currentPrice,
      listPrice: draft.listPrice,
      promoCode: draft.promoCode,
    });
    const live = priceNumber(rewritten.currentPrice);
    const list = priceNumber(rewritten.listPrice);
    const listPrice = list != null && live != null && list > live ? rewritten.listPrice : "";
    setDraft((current) => {
      const next = applyStackToDraft(current, {
        clipCoupon: rewritten.clipCoupon,
        subscribeSave: rewritten.subscribeSave,
        promoCode: rewritten.promoCode,
        currentPrice: rewritten.currentPrice,
        listPrice,
        summary: stackedWhyNote({
          merchant: current.merchant,
          currentPrice: live,
          clipCoupon: rewritten.clipCoupon,
          subscribeSave: rewritten.subscribeSave,
          promoCode: rewritten.promoCode,
        }),
        stackNote: isAppCouponMerchant(current.merchant)
          ? rewritten.promoCode
            ? `Enter ${rewritten.promoCode} in the app, then confirm the discount took.`
            : "Add the code at checkout in the app."
          : [
              rewritten.clipCoupon ? "Clip the on-page coupon." : "",
              rewritten.subscribeSave ? "Turn on Subscribe & Save." : "",
              rewritten.promoCode ? `Code ${rewritten.promoCode} at checkout.` : "",
            ]
              .filter(Boolean)
              .join(" ") || current.stackNote,
        verifyNote: rewritten.currentPrice
          ? `Cart should match $${rewritten.currentPrice} after the stack. Skip it if it does not.`
          : current.verifyNote,
      });
      next.bullets = rewritten.bullets;
      return next;
    });
    setNotice("Rewrote into our bullets. Check the numbers against the live listing.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-950">Queue</h2>
          <button type="button" className="text-xs font-semibold text-emerald-700" onClick={startNew}>
            New
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(["all", ...QUEUE_STAGES] as const).map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => setQueueFilter(stage)}
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                queueFilter === stage ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {stage}
              {stage !== "all" ? ` ${counts[stage]}` : ""}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-1">
          {visibleQueue.length === 0 ? (
            <li className="px-1 py-4 text-center text-xs text-slate-400">Empty</li>
          ) : (
            visibleQueue.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => loadQueued(item)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left ${
                    editingSlug === item.slug ? "bg-emerald-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    {item.queueStage}
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold text-slate-900">{item.title}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="mt-4 border-t border-slate-200 pt-3">
          <h2 className="text-sm font-semibold text-slate-950">Live</h2>
          <ul className="mt-2 space-y-1">
            {live.length === 0 ? (
              <li className="px-1 py-3 text-center text-xs text-slate-400">None</li>
            ) : (
              live.map((item) => {
                const dead = isDeadListing(item);
                const staffDead = item.status === "expired";
                const toggling = saving === `live:${item.slug}`;
                return (
                  <li key={item.id} className="flex items-start gap-1">
                    <button
                      type="button"
                      onClick={() => loadQueued(item)}
                      className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left ${
                        editingSlug === item.slug ? "bg-emerald-50" : dead ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        {dead ? "Dead" : "Live"}
                      </span>
                      <span className={`line-clamp-2 text-xs font-semibold ${dead ? "text-slate-500" : "text-slate-900"}`}>
                        {item.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(saving)}
                      onClick={() => void setLiveStatus(item)}
                      className="shrink-0 self-center rounded-md px-1.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                    >
                      {toggling ? "…" : staffDead ? "Revive" : "Mark Dead"}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </aside>

      <div className="space-y-4">
        <form
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (couponOnly) {
              if (!draft.title.trim() || !draft.promoCode.trim()) {
                setError("Coupon posts need a title and a code.");
                return;
              }
              void save("published", null, "publish");
              return;
            }
            if (needsPrice) {
              setError("Paste the live price before you publish. Do not invent one.");
              priceRef.current?.focus();
              return;
            }
            if (needsList) {
              setError("Was-price / list price is required, and it has to be higher than the deal price.");
              return;
            }
            void save("published", null, "publish");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="desk-url">URL</Label>
            <Input
              id="desk-url"
              ref={urlRef}
              autoFocus
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text");
                if (looksLikeUrl(pasted)) {
                  setUrl(pasted);
                  window.setTimeout(() => void runParse(pasted), 0);
                }
              }}
              onBlur={() => {
                if (looksLikeUrl(url) && !parsedUrls.current.has(url.trim())) void runParse(url);
              }}
              placeholder="Paste a product, deal-page, or coupon URL"
              className="h-12 text-base font-medium"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {parsing ? "Reading…" : couponOnly ? "Coupon code is the CTA. No retailer URL needed." : "Paste. Price if Amazon hid it. Publish."}
              </p>
              <Button
                type="button"
                tabIndex={-1}
                disabled={parsing || !looksLikeUrl(url)}
                onClick={() => void runParse(url)}
                className="h-8 shrink-0 bg-slate-900 px-3 text-xs text-white hover:bg-slate-800"
              >
                {parsing ? "Reading…" : "Read"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="Fills from the listing"
            />
          </div>

          {draft.scrapeNote ? (
            <p className="text-sm text-amber-800">{draft.scrapeNote}</p>
          ) : !couponOnly && needsPrice ? (
            <p className="text-sm text-amber-800">
              {draft.merchant === "amazon"
                ? "Amazon hid the price. Paste the live number from the listing tab."
                : "Paste the live price from the listing tab. Do not invent one."}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="price">Live price</Label>
              <Input
                id="price"
                ref={priceRef}
                inputMode="decimal"
                value={draft.currentPrice}
                onChange={(event) => applyStaffPrice("currentPrice", event.target.value)}
                placeholder="e.g. 19.88"
              />
            </div>
            {couponOnly ? (
              <div className="space-y-2">
                <Label htmlFor="code-fast">Coupon code</Label>
                <Input
                  id="code-fast"
                  value={draft.promoCode}
                  onChange={(event) =>
                    setDraft((current) => applyStackToDraft(current, { promoCode: event.target.value }))
                  }
                  placeholder="The code is the CTA"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="list-price">Was / list price</Label>
                <Input
                  id="list-price"
                  inputMode="decimal"
                  value={draft.listPrice}
                  onChange={(event) => applyStaffPrice("listPrice", event.target.value)}
                  placeholder="e.g. 29.99"
                />
              </div>
            )}
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

          <Button
            type="submit"
            disabled={Boolean(saving) || publishBlocked}
            className="h-12 w-full bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700"
          >
            {saving === "publish"
              ? editingLive
                ? "Saving…"
                : "Publishing…"
              : couponOnly
                ? editingLive
                  ? "Save live deal"
                  : "Publish to the site"
                : needsPrice
                  ? "Paste a live price to publish"
                  : needsList
                    ? "Paste a was-price higher than the deal"
                    : editingLive
                      ? "Save live deal"
                      : "Publish to the site"}
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              tabIndex={-1}
              variant="outline"
              disabled={Boolean(saving)}
              onClick={() => void save("draft", "incoming", "incoming")}
            >
              {saving === "incoming" ? "Saving…" : "Incoming"}
            </Button>
            <Button
              type="button"
              tabIndex={-1}
              variant="outline"
              disabled={Boolean(saving)}
              onClick={() => void save("draft", "draft", "draft")}
            >
              {saving === "draft" ? "Saving…" : "Draft"}
            </Button>
            <Button
              type="button"
              disabled={Boolean(saving) || !notesReady}
              onClick={() => void save("draft", "ready", "ready")}
              className="bg-slate-900 text-white hover:bg-slate-800"
            >
              {saving === "ready" ? "Saving…" : notesReady ? "Ready" : "Ready (notes)"}
            </Button>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">Preview</p>
            <DealCard deal={preview} variant="preview" />
          </div>

          <details className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">More</summary>
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-4 text-sm font-medium text-slate-800">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.clipCoupon}
                    onChange={(event) =>
                      setDraft((current) => applyStackToDraft(current, { clipCoupon: event.target.checked }))
                    }
                    className="size-4 accent-blue-600"
                  />
                  Clip coupon (AC)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.subscribeSave}
                    onChange={(event) =>
                      setDraft((current) => applyStackToDraft(current, { subscribeSave: event.target.checked }))
                    }
                    className="size-4 accent-blue-600"
                  />
                  Subscribe &amp; Save (SnS)
                </label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paste-copy">Paste someone else&apos;s writeup</Label>
                <Textarea
                  id="paste-copy"
                  value={draft.pasteCopy}
                  onChange={(event) => setDraft({ ...draft, pasteCopy: event.target.value })}
                  placeholder="Drop a Slickdeals / X / blog blurb. We keep the numbers and rewrite the how-to in our words."
                  className="min-h-20 bg-white"
                />
                <button
                  type="button"
                  className="text-xs font-semibold text-emerald-700 disabled:text-slate-400"
                  disabled={!draft.pasteCopy.trim()}
                  onClick={applyPastedRewrite}
                >
                  Rewrite as ours
                </button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Why this is good</Label>
                <Textarea
                  id="summary"
                  ref={whyRef}
                  value={draft.summary}
                  onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                  placeholder="Optional for Publish. Needed for Ready."
                  className="min-h-20 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stack-note">How the stack works</Label>
                <Textarea
                  id="stack-note"
                  value={draft.stackNote}
                  onChange={(event) => setDraft({ ...draft, stackNote: event.target.value })}
                  placeholder="Optional for Publish. Needed for Ready."
                  className="min-h-20 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="verify-note">Verify in the cart</Label>
                <Textarea
                  id="verify-note"
                  value={draft.verifyNote}
                  onChange={(event) => setDraft({ ...draft, verifyNote: event.target.value })}
                  placeholder="Optional for Publish. Needed for Ready."
                  className="min-h-20 bg-white"
                />
              </div>
              {canComposeSocial ? (
                <div className="space-y-3">
                  <SocialDraftBox
                    id="social-x"
                    label="X draft"
                    hint="Autofilled. Auto-post on Publish only if SOCIAL_AUTO_POST=true."
                    value={draft.socialPost}
                    copyMeta={`${draft.socialPost.length}/280`}
                    copiedLabel="X draft copied."
                    showUrlHint={!editingSlug}
                    onChange={(value) => {
                      setXDraftLocked(true);
                      setDraft({ ...draft, socialPost: value });
                    }}
                    onRebuild={() => {
                      setDraft({ ...draft, socialPost: composeXDraft() });
                      setXDraftLocked(true);
                    }}
                    onCopy={async () => {
                      await navigator.clipboard.writeText(draft.socialPost);
                    }}
                  />
                  <SocialDraftBox
                    id="social-ig"
                    label="Instagram caption"
                    hint="@actuallydeals_. Autofilled."
                    value={draft.instagramPost}
                    copyMeta="Copy"
                    copiedLabel="Instagram caption copied."
                    showUrlHint={!editingSlug}
                    onChange={(value) => {
                      setIgDraftLocked(true);
                      setDraft({ ...draft, instagramPost: value });
                    }}
                    onRebuild={() => {
                      setDraft({ ...draft, instagramPost: composeIgDraft() });
                      setIgDraftLocked(true);
                    }}
                    onCopy={async () => {
                      await navigator.clipboard.writeText(draft.instagramPost);
                    }}
                  />
                  <SocialDraftBox
                    id="social-fb"
                    label="Facebook post"
                    hint="Page name ActuallyDeals. Autofilled."
                    value={draft.facebookPost}
                    copyMeta="Copy"
                    copiedLabel="Facebook draft copied."
                    showUrlHint={!editingSlug}
                    onChange={(value) => {
                      setFbDraftLocked(true);
                      setDraft({ ...draft, facebookPost: value });
                    }}
                    onRebuild={() => {
                      setDraft({ ...draft, facebookPost: composeFbDraft() });
                      setFbDraftLocked(true);
                    }}
                    onCopy={async () => {
                      await navigator.clipboard.writeText(draft.facebookPost);
                    }}
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Bullets</Label>
                {["Price context", "Shipping / pickup", "How to get it"].map((placeholder, index) => (
                  <Textarea
                    key={placeholder}
                    value={draft.bullets[index]}
                    onChange={(event) => {
                      const bullets = [...draft.bullets];
                      bullets[index] = event.target.value;
                      setDraft({ ...draft, bullets });
                    }}
                    placeholder={placeholder}
                    className="min-h-16 bg-white"
                  />
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Promo code</Label>
                <Input
                  id="code"
                  value={draft.promoCode}
                  onChange={(event) =>
                    setDraft((current) => applyStackToDraft(current, { promoCode: event.target.value }))
                  }
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image-complete">Image URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="image-complete"
                    ref={imageRef}
                    value={draft.imageUrl}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        imageUrl: event.target.value,
                        scrapedImageUrl: event.target.value || draft.scrapedImageUrl,
                      })
                    }
                    className="bg-white"
                  />
                  {draft.imageUrl ? (
                    <img
                      src={draft.imageUrl}
                      alt=""
                      className="size-10 shrink-0 rounded-lg border border-slate-200 bg-white object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="merchant">Merchant</Label>
                  <select
                    id="merchant"
                    value={draft.merchant}
                    onChange={(event) => setDraft({ ...draft, merchant: event.target.value as Merchant })}
                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    {Object.values(MERCHANT_PROFILES).map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={draft.category}
                    onChange={(event) => setDraft({ ...draft, category: event.target.value as DealCategory })}
                    className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    {DEAL_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category.replace("-", " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="sku">ASIN / SKU / TCIN</Label>
                  <Input
                    id="sku"
                    value={draft.merchantProductId}
                    onChange={(event) => setDraft({ ...draft, merchantProductId: event.target.value })}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm font-medium text-slate-800">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.isPriceMistake}
                    onChange={(event) => setDraft({ ...draft, isPriceMistake: event.target.checked })}
                    className="size-4 accent-red-600"
                  />
                  Price mistake
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.isStackingHack}
                    onChange={(event) => setDraft({ ...draft, isStackingHack: event.target.checked })}
                    className="size-4 accent-blue-600"
                  />
                  Coupon stack
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.isFeatured}
                    onChange={(event) => setDraft({ ...draft, isFeatured: event.target.checked })}
                    className="size-4 accent-emerald-600"
                  />
                  Feature on the feed
                </label>
              </div>
            </div>
          </details>
        </form>
      </div>
    </div>
  );
}
