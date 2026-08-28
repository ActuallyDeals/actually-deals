import { NextResponse } from "next/server";

import { SEED_DEALS } from "@/data/seed-deals";

export async function GET() {
  return NextResponse.json({
    source: "seed",
    note: "Published deals live in the browser until Supabase is connected.",
    deals: SEED_DEALS,
  });
}
