import { NextResponse } from "next/server";

import { listDeals, saveDeal } from "@/lib/server-db";
import type { Deal } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ deals: listDeals() });
}

export async function POST(request: Request) {
  let deal: Deal;
  try {
    deal = (await request.json()) as Deal;
  } catch {
    return NextResponse.json({ error: "Send a deal JSON body." }, { status: 400 });
  }

  if (!deal?.title || !deal?.dealUrl || !deal?.slug) {
    return NextResponse.json({ error: "Deal needs a title, link, and slug." }, { status: 400 });
  }

  const saved = saveDeal({
    ...deal,
    id: deal.id || crypto.randomUUID(),
    createdAt: deal.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ deal: saved });
}
