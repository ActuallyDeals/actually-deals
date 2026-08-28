import { NextResponse } from "next/server";

import { listComments, saveComment } from "@/lib/server-db";
import type { DealComment } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const dealId = new URL(request.url).searchParams.get("dealId");
  if (!dealId) {
    return NextResponse.json({ error: "dealId is required." }, { status: 400 });
  }
  return NextResponse.json({ comments: listComments(dealId) });
}

export async function POST(request: Request) {
  let body: { dealId?: string; authorName?: string; content?: string };
  try {
    body = (await request.json()) as { dealId?: string; authorName?: string; content?: string };
  } catch {
    return NextResponse.json({ error: "Send JSON." }, { status: 400 });
  }

  if (!body.dealId || !body.content?.trim()) {
    return NextResponse.json({ error: "Write a comment first." }, { status: 400 });
  }

  const comment: DealComment = {
    id: crypto.randomUUID(),
    dealId: body.dealId,
    authorName: body.authorName?.trim() || "Deal Hunter",
    content: body.content.trim(),
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ comment: saveComment(comment) });
}
