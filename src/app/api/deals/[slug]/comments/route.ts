import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { addComment, getDealBySlug } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  try {
    const deal = await getDealBySlug(slug);
    if (!deal || deal.status !== "published") {
      return NextResponse.json({ error: "Deal not found." }, { status: 404 });
    }
    const body = (await request.json()) as { authorName?: string; body?: string };
    const comment = await addComment(deal.id, body.authorName ?? "", body.body ?? "");
    revalidatePath(`/deal/${slug}`);
    revalidatePath("/");
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not post comment." },
      { status: 400 },
    );
  }
}
