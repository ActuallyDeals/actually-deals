import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { attachAffiliate, cleanTrackingParams } from "@/lib/affiliate";
import { composeSocialDrafts, serializeSocialDrafts, buildStackingSteps } from "@/lib/copy-engine";
import { staffWriteupBoxes, writeupReady } from "@/lib/editorial";
import { isBrandedPlaceholder, isUsableImageUrl, resolveDealImage } from "@/lib/images";
import { upgradeAmazonImageUrl } from "@/lib/merchants";
import { SEED_COMMENTS, SEED_DEALS, SEED_VOTES } from "@/lib/seed";
import { createId, uniqueSlug } from "@/lib/slug";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type {
  Deal,
  DealComment,
  DealVote,
  PublishDealInput,
  QueueStage,
  VoteChoice,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

interface PersistedState {
  deals: Deal[];
  votes: DealVote[];
  comments: DealComment[];
  seeded: boolean;
}

interface GlobalStore {
  state: PersistedState;
  writeQueue: Promise<void>;
}

const globalForStore = globalThis as typeof globalThis & {
  __actuallyDealsStore?: GlobalStore;
};

function emptyState(): PersistedState {
  return { deals: [], votes: [], comments: [], seeded: false };
}

function normalizeDeal(deal: Deal): Deal {
  const status = deal.status ?? "published";
  return {
    ...deal,
    isStackingHack: deal.isStackingHack ?? Boolean(deal.promoCode),
    isFeatured: deal.isFeatured ?? false,
    category:
      (deal.category as string) === "price-errors"
        ? "price-mistakes"
        : (deal.category ?? (deal.isPriceMistake ? "price-mistakes" : "general")),
    stackingSteps: deal.stackingSteps ?? [],
    socialPost: deal.socialPost ?? null,
    affiliateUrl: attachAffiliate(deal.sourceUrl, deal.merchant),
    queueStage:
      status === "published"
        ? null
        : (deal.queueStage ?? "draft"),
  };
}

function cloneState(state: PersistedState): PersistedState {
  return structuredClone(state);
}

function recount(state: PersistedState, dealId: string): void {
  const deal = state.deals.find((item) => item.id === dealId);
  if (!deal) return;
  const votes = state.votes.filter((vote) => vote.dealId === dealId);
  deal.aliveVotes = votes.filter((vote) => vote.choice === "alive").length;
  deal.expiredVotes = votes.filter((vote) => vote.choice === "expired").length;
  deal.commentCount = state.comments.filter((comment) => comment.dealId === dealId).length;
  deal.updatedAt = new Date().toISOString();
}

function seedIfEmpty(state: PersistedState): void {
  if (state.deals.length > 0 || state.seeded) return;
  state.deals = structuredClone(SEED_DEALS);
  state.comments = structuredClone(SEED_COMMENTS);
  state.votes = structuredClone(SEED_VOTES);
  state.seeded = true;
  for (const deal of state.deals) recount(state, deal.id);
}

async function readFileState(): Promise<PersistedState | null> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed || !Array.isArray(parsed.deals)) return null;
    return {
      deals: (parsed.deals ?? []).map((deal) => normalizeDeal(deal)),
      votes: parsed.votes ?? [],
      comments: parsed.comments ?? [],
      seeded: Boolean(parsed.seeded),
    };
  } catch {
    return null;
  }
}

async function writeFileState(state: PersistedState): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Serverless / read-only filesystems keep working from memory.
  }
}

async function getMemory(): Promise<PersistedState> {
  if (!globalForStore.__actuallyDealsStore) {
    const fromDisk = await readFileState();
    const state = fromDisk ?? emptyState();
    seedIfEmpty(state);
    globalForStore.__actuallyDealsStore = {
      state,
      writeQueue: Promise.resolve(),
    };
    if (!fromDisk) {
      void writeFileState(state);
    }
  }
  return globalForStore.__actuallyDealsStore.state;
}

function persistMemory(state: PersistedState): void {
  const holder = globalForStore.__actuallyDealsStore;
  if (!holder) return;
  holder.writeQueue = holder.writeQueue
    .then(() => writeFileState(state))
    .catch(() => undefined);
}

function mapDealRow(row: Record<string, unknown>, extras?: { alive?: number; expired?: number; comments?: number }): Deal {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    merchant: row.merchant as Deal["merchant"],
    merchantProductId: (row.merchant_product_id as string | null) ?? null,
    sourceUrl: String(row.source_url),
    affiliateUrl: attachAffiliate(String(row.source_url), row.merchant as Deal["merchant"]),
    scrapedImageUrl: (row.scraped_image_url as string | null) ?? null,
    imageUrl: String(row.image_url),
    currentPrice: Number(row.current_price),
    listPrice: row.list_price == null ? null : Number(row.list_price),
    promoCode: (row.promo_code as string | null) ?? null,
    isPriceMistake: Boolean(row.is_price_mistake),
    isStackingHack: Boolean(row.is_stacking_hack),
    isFeatured: Boolean(row.is_featured),
    category:
      (row.category as string) === "price-errors"
        ? "price-mistakes"
        : ((row.category as Deal["category"]) || "general"),
    bullets: Array.isArray(row.bullets) ? (row.bullets as string[]) : [],
    stackingSteps: Array.isArray(row.stacking_steps)
      ? (row.stacking_steps as Deal["stackingSteps"])
      : [],
    socialPost: (row.social_post as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
    status: row.status as Deal["status"],
    queueStage:
      (row.status as Deal["status"]) === "published"
        ? null
        : ((row.queue_stage as QueueStage | null) ?? "draft"),
    publishedAt: (row.published_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    aliveVotes: extras?.alive ?? 0,
    expiredVotes: extras?.expired ?? 0,
    commentCount: extras?.comments ?? 0,
  };
}

async function hydrateDealCounts(deals: Deal[]): Promise<Deal[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase || deals.length === 0) return deals;
  const ids = deals.map((deal) => deal.id);

  const [{ data: votes }, { data: comments }] = await Promise.all([
    supabase.from("deal_votes").select("deal_id, choice").in("deal_id", ids),
    supabase.from("deal_comments").select("deal_id").in("deal_id", ids),
  ]);

  const alive = new Map<string, number>();
  const expired = new Map<string, number>();
  for (const vote of votes ?? []) {
    const id = String((vote as { deal_id: string }).deal_id);
    const choice = (vote as { choice: VoteChoice }).choice;
    if (choice === "alive") alive.set(id, (alive.get(id) ?? 0) + 1);
    if (choice === "expired") expired.set(id, (expired.get(id) ?? 0) + 1);
  }
  const commentCounts = new Map<string, number>();
  for (const comment of comments ?? []) {
    const id = String((comment as { deal_id: string }).deal_id);
    commentCounts.set(id, (commentCounts.get(id) ?? 0) + 1);
  }

  return deals.map((deal) => ({
    ...deal,
    aliveVotes: alive.get(deal.id) ?? 0,
    expiredVotes: expired.get(deal.id) ?? 0,
    commentCount: commentCounts.get(deal.id) ?? 0,
  }));
}

async function ensureSupabaseSeed(): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { count, error } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  if ((count ?? 0) > 0) return;

  const rows = SEED_DEALS.map((deal) => ({
    id: deal.id,
    slug: deal.slug,
    title: deal.title,
    merchant: deal.merchant,
    merchant_product_id: deal.merchantProductId,
    source_url: deal.sourceUrl,
    affiliate_url: deal.affiliateUrl,
    scraped_image_url: deal.scrapedImageUrl,
    image_url: deal.imageUrl,
    current_price: deal.currentPrice,
    list_price: deal.listPrice,
    promo_code: deal.promoCode,
    is_price_mistake: deal.isPriceMistake,
    is_stacking_hack: deal.isStackingHack,
    is_featured: deal.isFeatured,
    category: deal.category,
    bullets: deal.bullets,
    stacking_steps: deal.stackingSteps,
    social_post: deal.socialPost,
    summary: deal.summary,
    status: deal.status,
    queue_stage: deal.queueStage,
    published_at: deal.publishedAt,
    created_at: deal.createdAt,
    updated_at: deal.updatedAt,
  }));
  const { error: insertError } = await supabase.from("deals").insert(rows);
  if (insertError) throw new Error(insertError.message);

  if (SEED_COMMENTS.length > 0) {
    const { error: commentError } = await supabase.from("deal_comments").insert(
      SEED_COMMENTS.map((comment) => ({
        id: comment.id,
        deal_id: comment.dealId,
        author_name: comment.authorName,
        body: comment.body,
        created_at: comment.createdAt,
      })),
    );
    if (commentError) throw new Error(commentError.message);
  }
}

function staffPhotoUrl(value: string | null | undefined): string | null {
  if (!value || isBrandedPlaceholder(value) || !isUsableImageUrl(value)) return null;
  return upgradeAmazonImageUrl(value);
}

function dealToRow(deal: Deal) {
  return {
    id: deal.id,
    slug: deal.slug,
    title: deal.title,
    merchant: deal.merchant,
    merchant_product_id: deal.merchantProductId,
    source_url: deal.sourceUrl,
    affiliate_url: deal.affiliateUrl,
    scraped_image_url: deal.scrapedImageUrl,
    image_url: deal.imageUrl,
    current_price: deal.currentPrice,
    list_price: deal.listPrice,
    promo_code: deal.promoCode,
    is_price_mistake: deal.isPriceMistake,
    is_stacking_hack: deal.isStackingHack,
    is_featured: deal.isFeatured,
    category: deal.category,
    bullets: deal.bullets,
    stacking_steps: deal.stackingSteps,
    social_post: deal.socialPost,
    summary: deal.summary,
    status: deal.status,
    queue_stage: deal.queueStage,
    published_at: deal.publishedAt,
    created_at: deal.createdAt,
    updated_at: deal.updatedAt,
  };
}

function toDealFromInput(input: PublishDealInput, existingSlugs: Set<string>, previous?: Deal): Deal {
  const now = new Date().toISOString();
  const merchant = input.merchant;
  const sourceUrl = cleanTrackingParams(input.sourceUrl);
  const affiliateUrl = attachAffiliate(sourceUrl, merchant);
  const override = staffPhotoUrl(input.imageUrl);
  const scraped = override ?? input.scrapedImageUrl ?? previous?.scrapedImageUrl ?? null;
  const image = resolveDealImage({
    scrapedImageUrl: scraped,
    merchant,
    merchantProductId: input.merchantProductId ?? previous?.merchantProductId ?? null,
  });
  const status = input.status ?? "published";
  const queueStage: QueueStage | null =
    status === "published" ? null : (input.queueStage ?? previous?.queueStage ?? "draft");
  const slug = previous?.slug ?? uniqueSlug(input.title, existingSlugs);
  const currentPrice = Number.isFinite(input.currentPrice) ? Number(input.currentPrice) : 0;
  const writeup = staffWriteupBoxes({
    summary: input.summary ?? null,
    stackingSteps: input.stackingSteps ?? previous?.stackingSteps ?? [],
  });
  return {
    id: previous?.id ?? createId(),
    slug,
    title: input.title.trim(),
    merchant,
    merchantProductId: input.merchantProductId ?? null,
    sourceUrl,
    affiliateUrl,
    scrapedImageUrl: scraped,
    imageUrl: override || input.imageUrl || image.imageUrl,
    currentPrice,
    listPrice: input.listPrice ?? null,
    promoCode: input.promoCode?.trim() || null,
    isPriceMistake: Boolean(input.isPriceMistake),
    isStackingHack: Boolean(input.isStackingHack ?? input.promoCode),
    isFeatured: Boolean(input.isFeatured),
    category:
      (input.category as string) === "price-errors"
        ? "price-mistakes"
        : (input.category ?? (input.isPriceMistake ? "price-mistakes" : "general")),
    bullets: input.bullets.map((bullet) => bullet.trim()).filter(Boolean).slice(0, 3),
    stackingSteps:
      input.stackingSteps ??
      buildStackingSteps({
        merchant,
        promoCode: input.promoCode?.trim() || null,
        currentPrice,
      }),
    socialPost:
      input.socialPost?.trim() ||
      (input.summary?.trim() && input.currentPrice != null && input.currentPrice > 0
        ? serializeSocialDrafts(
            composeSocialDrafts({
              title: input.title.trim(),
              merchant,
              currentPrice,
              why: input.summary,
              stack: writeup.stack,
              verify: writeup.verify,
              slug,
            }),
          )
        : (previous?.socialPost ?? null)),
    summary: input.summary?.trim() || null,
    status,
    queueStage,
    publishedAt: status === "published" ? (previous?.publishedAt ?? now) : previous?.publishedAt ?? null,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    aliveVotes: previous?.aliveVotes ?? 0,
    expiredVotes: previous?.expiredVotes ?? 0,
    commentCount: previous?.commentCount ?? 0,
  };
}

export async function listPublishedDeals(): Promise<Deal[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeed();
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .in("status", ["published", "expired"])
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return hydrateDealCounts((data ?? []).map((row) => mapDealRow(row as Record<string, unknown>)));
  }

  const state = await getMemory();
  return state.deals
    .filter((deal) => deal.status === "published" || deal.status === "expired")
    .slice()
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export async function listQueuedDeals(): Promise<Deal[]> {
  const deals = await listAllDeals();
  return deals
    .filter((deal) => deal.status === "draft" && deal.queueStage)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listAllDeals(): Promise<Deal[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeed();
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return hydrateDealCounts((data ?? []).map((row) => mapDealRow(row as Record<string, unknown>)));
  }
  const state = await getMemory();
  return state.deals.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getDealBySlug(slug: string): Promise<Deal | null> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeed();
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase.from("deals").select("*").eq("slug", slug).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const [deal] = await hydrateDealCounts([mapDealRow(data as Record<string, unknown>)]);
    return deal ?? null;
  }
  const state = await getMemory();
  return state.deals.find((deal) => deal.slug === slug) ?? null;
}

function validateDealInput(input: PublishDealInput): void {
  if (!input.title?.trim() || !input.sourceUrl?.trim()) {
    throw new Error("Title and source URL are required.");
  }
  if (input.queueStage === "ready") {
    const boxes = staffWriteupBoxes({
      summary: input.summary ?? null,
      stackingSteps: input.stackingSteps ?? [],
    });
    if (!writeupReady(boxes.why, boxes.stack, boxes.verify)) {
      throw new Error("Ready needs why / stack / verify-in-cart notes. Incoming and Draft can stay blank.");
    }
  }
  const publishing = (input.status ?? "published") === "published";
  if (!publishing) return;
  if (input.bullets.filter((bullet) => bullet.trim()).length !== 3) {
    throw new Error("Every published deal needs exactly three summary bullets.");
  }
  if (input.currentPrice == null || !Number.isFinite(input.currentPrice) || input.currentPrice < 0) {
    throw new Error("Current price is required to publish. Do not invent one.");
  }
}

export async function publishDeal(input: PublishDealInput): Promise<Deal> {
  return saveDeal(input);
}

export async function saveDeal(input: PublishDealInput, previousSlug?: string): Promise<Deal> {
  validateDealInput(input);

  if (isSupabaseConfigured()) {
    await ensureSupabaseSeed();
    const supabase = getSupabaseAdmin()!;
    let previous: Deal | null = null;
    if (previousSlug) {
      const { data: previousRow, error: previousError } = await supabase
        .from("deals")
        .select("*")
        .eq("slug", previousSlug)
        .maybeSingle();
      if (previousError) throw new Error(previousError.message);
      if (!previousRow) throw new Error("Deal not found.");
      previous = mapDealRow(previousRow as Record<string, unknown>);
    }
    const { data: existingRows } = await supabase.from("deals").select("slug");
    const slugs = new Set((existingRows ?? []).map((row) => String((row as { slug: string }).slug)));
    const deal = toDealFromInput(input, slugs, previous ?? undefined);
    const row = dealToRow(deal);
    const { error } = previous
      ? await supabase.from("deals").update(row).eq("id", previous.id)
      : await supabase.from("deals").insert(row);
    if (error) throw new Error(error.message);
    return deal;
  }

  const state = await getMemory();
  const previous = previousSlug ? (state.deals.find((item) => item.slug === previousSlug) ?? null) : null;
  if (previousSlug && !previous) throw new Error("Deal not found.");
  const slugs = new Set(state.deals.map((deal) => deal.slug));
  const deal = toDealFromInput(input, slugs, previous ?? undefined);
  if (previous) {
    const index = state.deals.findIndex((item) => item.id === previous.id);
    state.deals[index] = deal;
  } else {
    state.deals.unshift(deal);
  }
  persistMemory(state);
  return deal;
}

export async function listComments(dealId: string): Promise<DealComment[]> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase
      .from("deal_comments")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      id: String((row as { id: string }).id),
      dealId: String((row as { deal_id: string }).deal_id),
      authorName: String((row as { author_name: string }).author_name),
      body: String((row as { body: string }).body),
      createdAt: String((row as { created_at: string }).created_at),
    }));
  }
  const state = await getMemory();
  return state.comments
    .filter((comment) => comment.dealId === dealId)
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addComment(
  dealId: string,
  authorName: string,
  body: string,
): Promise<DealComment> {
  const name = authorName.trim().slice(0, 40);
  const text = body.trim().slice(0, 800);
  if (name.length < 2) throw new Error("Name needs at least 2 characters.");
  if (text.length < 4) throw new Error("Comment is too short.");

  const comment: DealComment = {
    id: createId(),
    dealId,
    authorName: name,
    body: text,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { error } = await supabase.from("deal_comments").insert({
      id: comment.id,
      deal_id: comment.dealId,
      author_name: comment.authorName,
      body: comment.body,
      created_at: comment.createdAt,
    });
    if (error) throw new Error(error.message);
    return comment;
  }

  const state = await getMemory();
  if (!state.deals.some((deal) => deal.id === dealId)) {
    throw new Error("Deal not found.");
  }
  state.comments.push(comment);
  recount(state, dealId);
  persistMemory(state);
  return comment;
}

export async function voteOnDeal(
  dealId: string,
  voterKey: string,
  choice: VoteChoice,
): Promise<{ aliveVotes: number; expiredVotes: number; myVote: VoteChoice }> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { error } = await supabase.from("deal_votes").upsert(
      {
        deal_id: dealId,
        voter_key: voterKey,
        choice,
        updated_at: now,
      },
      { onConflict: "deal_id,voter_key" },
    );
    if (error) throw new Error(error.message);
    const { data } = await supabase.from("deal_votes").select("choice").eq("deal_id", dealId);
    const votes = data ?? [];
    return {
      aliveVotes: votes.filter((row) => (row as { choice: string }).choice === "alive").length,
      expiredVotes: votes.filter((row) => (row as { choice: string }).choice === "expired").length,
      myVote: choice,
    };
  }

  const state = await getMemory();
  const existing = state.votes.find((vote) => vote.dealId === dealId && vote.voterKey === voterKey);
  if (existing) {
    existing.choice = choice;
    existing.updatedAt = now;
  } else {
    state.votes.push({
      id: createId(),
      dealId,
      voterKey,
      choice,
      createdAt: now,
      updatedAt: now,
    });
  }
  recount(state, dealId);
  persistMemory(state);
  const deal = state.deals.find((item) => item.id === dealId);
  return {
    aliveVotes: deal?.aliveVotes ?? 0,
    expiredVotes: deal?.expiredVotes ?? 0,
    myVote: choice,
  };
}

export async function getMyVote(dealId: string, voterKey: string): Promise<VoteChoice | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdmin()!;
    const { data, error } = await supabase
      .from("deal_votes")
      .select("choice")
      .eq("deal_id", dealId)
      .eq("voter_key", voterKey)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.choice as VoteChoice | undefined) ?? null;
  }
  const state = await getMemory();
  return state.votes.find((vote) => vote.dealId === dealId && vote.voterKey === voterKey)?.choice ?? null;
}
