import { NextResponse } from "next/server";
import { adminCookieHeader, adminPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const expected = adminPassword();
  if (!expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const body = (await request.json()) as { password?: string };
  if ((body.password ?? "") !== expected) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", adminCookieHeader());
  return response;
}
