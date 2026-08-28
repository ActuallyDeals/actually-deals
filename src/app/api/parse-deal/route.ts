import { NextResponse } from "next/server";

import { parseDealUrl } from "@/lib/deal-ingest";

export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Send JSON with a url field." }, { status: 400 });
  }

  try {
    const parsed = await parseDealUrl(body.url ?? "");
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not parse that URL.",
      },
      { status: 400 },
    );
  }
}
