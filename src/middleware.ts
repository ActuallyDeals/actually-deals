import { NextResponse, type NextRequest } from "next/server";

const VOTER_COOKIE = "ad_voter";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get(VOTER_COOKIE)?.value) {
    response.cookies.set(VOTER_COOKIE, crypto.randomUUID(), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|placeholders/).*)"],
};
