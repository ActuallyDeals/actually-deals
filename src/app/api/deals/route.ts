import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { autoPostSocial } from "@/lib/social-post";
import { isCouponOnlyDeal } from "@/lib/outbound";
import { listPublicDeals, listQueuedDeals, saveDeal } from "@/lib/store";
import { MERCHANTS, type PublishDealInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const queue = new URL(request.url).searchParams.get("queue");
    if (queue) {
      if (!(await isAdmin())) {
        return NextResponse.json({ error: "Sign in at /admin first." }, { status: 401 });
      }
      const deals = await listQueuedDeals();
      return NextResponse.json({ deals });
    }
    const deals = await listPublicDeals();
    return NextResponse.json({ deals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load deals." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Sign in at /admin first." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as PublishDealInput;
    const couponOnly = isCouponOnlyDeal({
      promoCode: body.promoCode,
      sourceUrl: body.sourceUrl,
      merchant: body.merchant,
    });
    if (!body.title?.trim() || (!couponOnly && !body.sourceUrl?.trim())) {
      return NextResponse.json({ error: "Title and source URL are required." }, { status: 400 });
    }
    if (!MERCHANTS.includes(body.merchant)) {
      return NextResponse.json({ error: "Unknown merchant." }, { status: 400 });
    }
    const deal = await saveDeal(body);
    revalidatePath("/");
    revalidatePath("/admin");
    if (deal.status === "published") revalidatePath(`/deal/${deal.slug}`);
    let socialError: string | undefined;
    let socialPosted: string[] | undefined;
    if (deal.status === "published") {
      const social = await autoPostSocial(deal, { force: Boolean(body.postToSocial) });
      socialPosted = social.posted;
      socialError = social.error ?? undefined;
    }
    return NextResponse.json({ deal, socialError, socialPosted }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save deal." },
      { status: 400 },
    );
  }
}
