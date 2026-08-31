import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
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
    if (!body.title?.trim() || !body.sourceUrl?.trim()) {
      return NextResponse.json({ error: "Title and source URL are required." }, { status: 400 });
    }
    if (!MERCHANTS.includes(body.merchant)) {
      return NextResponse.json({ error: "Unknown merchant." }, { status: 400 });
    }
    const deal = await saveDeal(body, slug);
    revalidatePath("/");
    revalidatePath("/admin");
    if (deal.status === "published") revalidatePath(`/deal/${deal.slug}`);
    return NextResponse.json({ deal });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update deal." },
      { status: 400 },
    );
  }
}
