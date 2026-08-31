import { cookies } from "next/headers";
import { VOTER_COOKIE } from "@/lib/auth";
import { createId } from "@/lib/slug";

export async function getVoterKey(): Promise<{ key: string; setCookie: boolean }> {
  const jar = await cookies();
  const existing = jar.get(VOTER_COOKIE)?.value;
  if (existing && existing.length >= 8) return { key: existing, setCookie: false };
  return { key: createId(), setCookie: true };
}

export function voterCookieHeader(key: string): string {
  return `${VOTER_COOKIE}=${key}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
}
