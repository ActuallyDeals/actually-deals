import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { autoPostSocial } from "@/lib/social-post";
import { getDealBySlug } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Sign in at /admin first." }, { status: 401 });
  }
  const { slug } = await context.params;
  const deal = await getDealBySlug(slug);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found." }, { status: 404 });
  }
  if (deal.status !== "published") {
    return NextResponse.json({ error: "Only live deals can post to socials." }, { status: 400 });
  }
  const social = await autoPostSocial(deal, { force: true });
  return NextResponse.json({
    posted: social.posted,
    error: social.error,
  });
}
