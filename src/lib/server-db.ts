import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { SEED_DEALS } from "@/data/seed-deals";
import type { Deal, DealComment } from "@/lib/types";

const DB_PATH = join(process.cwd(), "data", "runtime.json");

type RuntimeDb = {
  deals: Deal[];
  comments: DealComment[];
};

function emptyDb(): RuntimeDb {
  return { deals: [], comments: [] };
}

function readDb(): RuntimeDb {
  try {
    const raw = readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as RuntimeDb;
    return {
      deals: Array.isArray(parsed.deals) ? parsed.deals : [],
      comments: Array.isArray(parsed.comments) ? parsed.comments : [],
    };
  } catch {
    return emptyDb();
  }
}

function writeDb(db: RuntimeDb) {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function listDeals(): Deal[] {
  const published = readDb().deals;
  const used = new Set(published.flatMap((deal) => [deal.id, deal.slug]));
  const seeds = SEED_DEALS.filter((deal) => !used.has(deal.id) && !used.has(deal.slug));
  return [...published, ...seeds].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function findDeal(slug: string): Deal | undefined {
  return listDeals().find((deal) => deal.slug === slug);
}

export function saveDeal(deal: Deal): Deal {
  const db = readDb();
  const next = {
    ...deal,
    slug: uniqueSlug(deal.slug, db.deals),
    updatedAt: new Date().toISOString(),
  };
  db.deals = [next, ...db.deals.filter((item) => item.id !== next.id && item.slug !== next.slug)];
  writeDb(db);
  return next;
}

export function updateDeal(deal: Deal): Deal {
  const db = readDb();
  const index = db.deals.findIndex((item) => item.id === deal.id || item.slug === deal.slug);
  if (index === -1) {
    db.deals.unshift(deal);
  } else {
    db.deals[index] = deal;
  }
  writeDb(db);
  return deal;
}

export function listComments(dealId: string): DealComment[] {
  return readDb()
    .comments.filter((comment) => comment.dealId === dealId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveComment(comment: DealComment): DealComment {
  const db = readDb();
  db.comments.unshift(comment);
  writeDb(db);
  return comment;
}

function uniqueSlug(base: string, deals: Deal[]): string {
  const used = new Set([...deals, ...SEED_DEALS].map((deal) => deal.slug));
  if (!used.has(base)) {
    return base;
  }
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}
