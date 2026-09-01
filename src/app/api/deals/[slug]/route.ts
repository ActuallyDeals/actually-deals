import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isCouponOnlyDeal } from "@/lib/outbound";
import { autoPostSocial } from "@/lib/social-post";
import { getDealBySlug, listComments, saveDeal } from "@/lib/store";
import { MERCHANTS, type PublishDealInput } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  try {
    const deal = await getDealBySlug(slug);
    if (!deal) return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    if (deal.status !== "published" && !(await isAdmin())) {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }
    const comments = await listComments(deal.id);
    return NextResponse.json({ deal, comments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load deal." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Sign in at /admin first." }, { status: 401 });
  }
  const { slug } = await context.params;
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
    const existing = await getDealBySlug(slug);
    const deal = await saveDeal(body, slug);
    revalidatePath("/");
    revalidatePath("/admin");
    if (deal.status === "published" || deal.status === "expired") revalidatePath(`/deal/${deal.slug}`);
    let socialError: string | undefined;
    let socialPosted: string[] | undefined;
    if (deal.status === "published" && existing?.status === "draft") {
      const social = await autoPostSocial(deal);
      socialPosted = social.posted;
      socialError = social.error ?? undefined;
    }
    return NextResponse.json({ deal, socialError, socialPosted });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update deal." },
      { status: 400 },
    );
  }
}
