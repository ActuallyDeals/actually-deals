import { NextResponse } from "next/server";

import { findDeal, listDeals, updateDeal } from "@/lib/server-db";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { slug?: string; isAlive?: boolean };
  try {
    body = (await request.json()) as { slug?: string; isAlive?: boolean };
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }

  if (!body.slug || typeof body.isAlive !== "boolean") {
    return NextResponse.json({ error: "slug and isAlive are required." }, { status: 400 });
  }

  const current = findDeal(body.slug) ?? listDeals().find((deal) => deal.slug === body.slug);
  if (!current) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }

  const next = {
    ...current,
    upvotes: current.upvotes + (body.isAlive ? 1 : 0),
    downvotes: current.downvotes + (body.isAlive ? 0 : 1),
    updatedAt: new Date().toISOString(),
  };
  const total = next.upvotes + next.downvotes;
  next.isExpired = total > 0 && next.downvotes / total > 0.7;

  return NextResponse.json({ deal: updateDeal(next) });
}
