import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ParseDealError, parseDealUrl } from "@/lib/parse-deal";

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
    const parsed = await parseDealUrl(body.url);
    return NextResponse.json(parsed);
  } catch (error) {
    if (error instanceof ParseDealError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not parse that deal." }, { status: 500 });
  }
}
