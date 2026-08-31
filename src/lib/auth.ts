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

export async function isAdmin(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === "1";
}

export function adminCookieHeader(): string {
  return `${ADMIN_COOKIE}=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
}
