import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ingestDealPaste } from "@/lib/ingest-roundup";
import { ParseDealError } from "@/lib/parse-deal";
import { findDeskDuplicate } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url) {
      return NextResponse.json({ error: "A product URL is required." }, { status: 400 });
    }
    const parsed = await ingestDealPaste(body.url);
    const first = parsed.deals[0];
    const hit = first?.merchantProductId
      ? await findDeskDuplicate(first.merchant, first.merchantProductId)
      : null;
    const deskDuplicate = hit ? { slug: hit.slug, title: hit.title } : null;
    return NextResponse.json({ ...parsed, deskDuplicate });
  } catch (error) {
    if (error instanceof ParseDealError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not parse that deal." }, { status: 500 });
  }
}
