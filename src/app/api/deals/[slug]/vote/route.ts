import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getDealBySlug, voteOnDeal } from "@/lib/store";
import { VOTE_CHOICES, type VoteChoice } from "@/lib/types";
import { getVoterKey, voterCookieHeader } from "@/lib/voter";

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

    const body = (await request.json()) as { choice?: VoteChoice };
    if (!body.choice || !VOTE_CHOICES.includes(body.choice)) {
      return NextResponse.json({ error: "Choose Alive or Expired." }, { status: 400 });
    }

    const voter = await getVoterKey();
    const result = await voteOnDeal(deal.id, voter.key, body.choice);
    revalidatePath("/");
    revalidatePath(`/deal/${slug}`);

    const response = NextResponse.json(result);
    if (voter.setCookie) {
      response.headers.append("Set-Cookie", voterCookieHeader(voter.key));
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not record vote." },
      { status: 500 },
    );
  }
}
