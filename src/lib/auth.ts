import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "ad_admin";
export const VOTER_COOKIE = "ad_voter";

/** Real env password only. Empty or missing means the desk is locked. No default. */
export function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim() ?? "";
  return value.length > 0 ? value : null;
}

export function isAdminConfigured(): boolean {
  return adminPassword() !== null;
}

/** Session token derived from the password: changing ADMIN_PASSWORD logs everyone out, and a forged cookie never works. */
function sessionToken(): string {
  return createHmac("sha256", adminPassword() ?? "").update("actually-deals-admin-session-v1").digest("hex");
}

export async function isAdmin(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const jar = await cookies();
  const got = jar.get(ADMIN_COOKIE)?.value ?? "";
  const want = sessionToken();
  if (got.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export function adminCookieHeader(): string {
  return `${ADMIN_COOKIE}=${sessionToken()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}
