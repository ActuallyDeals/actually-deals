/**
 * Auto-post original X / Instagram / Facebook drafts after a site publish.
 *
 * Kill switch (default OFF): SOCIAL_AUTO_POST=true
 *
 * X (Twitter API v2, OAuth 1.0a user context) — Vercel:
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 * Instagram Graph API content publishing — Vercel:
 *   INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID
 * Facebook Graph API Page feed — Vercel:
 *   FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN
 *
 * Official APIs only. Missing credentials no-op that network. Never scrape cookies
 * or invent keys. Incoming/Draft are never posted. Site publish must succeed even
 * if this adapter fails.
 */
import { createHmac, randomBytes } from "node:crypto";
import { parseSocialDrafts } from "@/lib/copy-engine";
import { isBrandedPlaceholder, isUsableImageUrl } from "@/lib/images";
import { looksClonedWriteup } from "@/lib/stack-copy";
import type { Deal } from "@/lib/types";

export function socialAutoPostEnabled(): boolean {
  return process.env.SOCIAL_AUTO_POST === "true";
}

function env(...keys: string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

type XCreds = {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
};

function xCredentials(): XCreds | null {
  const apiKey = env("X_API_KEY", "TWITTER_API_KEY");
  const apiSecret = env("X_API_SECRET", "TWITTER_API_SECRET");
  const accessToken = env("X_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN");
  const accessSecret = env("X_ACCESS_TOKEN_SECRET", "TWITTER_ACCESS_TOKEN_SECRET");
  if (!apiKey || !apiSecret || !accessToken || !accessSecret) return null;
  return { apiKey, apiSecret, accessToken, accessSecret };
}

function instagramCredentials(): { token: string; igUserId: string } | null {
  const token = env("INSTAGRAM_ACCESS_TOKEN");
  const igUserId = env("INSTAGRAM_BUSINESS_ACCOUNT_ID");
  if (!token || !igUserId) return null;
  return { token, igUserId };
}

function facebookCredentials(): { token: string; pageId: string } | null {
  const token = env("FACEBOOK_PAGE_ACCESS_TOKEN");
  const pageId = env("FACEBOOK_PAGE_ID");
  if (!token || !pageId) return null;
  return { token, pageId };
}

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/!/g, "%21")
    .replace(/\*/g, "%2A")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");
}

function oauth1Header(method: string, url: string, creds: XCreds): string {
  const params: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };
  const baseParams = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join("&");
  const base = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(baseParams)}`;
  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessSecret)}`;
  params.oauth_signature = createHmac("sha1", signingKey).update(base).digest("base64");
  const header = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(params[key])}"`)
    .join(", ");
  return `OAuth ${header}`;
}

function publicImageUrl(deal: Deal): string | null {
  const candidate = deal.scrapedImageUrl || deal.imageUrl;
  if (!candidate || isBrandedPlaceholder(candidate) || !isUsableImageUrl(candidate)) return null;
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) return candidate;
  return null;
}

function publicDealUrl(deal: Deal): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://actuallydeals.com").replace(/\/$/, "");
  return `${site}/deal/${deal.slug}`;
}

async function postToX(text: string, creds: XCreds): Promise<void> {
  const url = "https://api.twitter.com/2/tweets";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: oauth1Header("POST", url, creds),
      "content-type": "application/json",
    },
    body: JSON.stringify({ text: text.slice(0, 280) }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`X ${response.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
  }
}

async function postToInstagram(caption: string, imageUrl: string, creds: { token: string; igUserId: string }): Promise<void> {
  const createUrl = new URL(`https://graph.facebook.com/v21.0/${creds.igUserId}/media`);
  createUrl.searchParams.set("image_url", imageUrl);
  createUrl.searchParams.set("caption", caption);
  createUrl.searchParams.set("access_token", creds.token);
  const created = await fetch(createUrl, { method: "POST", signal: AbortSignal.timeout(15_000) });
  const createdPayload = (await created.json()) as { id?: string; error?: { message?: string } };
  if (!created.ok || !createdPayload.id) {
    throw new Error(createdPayload.error?.message || `Instagram media ${created.status}`);
  }
  const publishUrl = new URL(`https://graph.facebook.com/v21.0/${creds.igUserId}/media_publish`);
  publishUrl.searchParams.set("creation_id", createdPayload.id);
  publishUrl.searchParams.set("access_token", creds.token);
  const published = await fetch(publishUrl, { method: "POST", signal: AbortSignal.timeout(15_000) });
  const publishedPayload = (await published.json()) as { id?: string; error?: { message?: string } };
  if (!published.ok) {
    throw new Error(publishedPayload.error?.message || `Instagram publish ${published.status}`);
  }
}

async function postToFacebook(message: string, link: string, creds: { token: string; pageId: string }): Promise<void> {
  const url = new URL(`https://graph.facebook.com/v21.0/${creds.pageId}/feed`);
  url.searchParams.set("message", message);
  url.searchParams.set("link", link);
  url.searchParams.set("access_token", creds.token);
  const response = await fetch(url, { method: "POST", signal: AbortSignal.timeout(12_000) });
  const payload = (await response.json()) as { id?: string; error?: { message?: string } };
  if (!response.ok) {
    throw new Error(payload.error?.message || `Facebook ${response.status}`);
  }
}

export interface SocialPostResult {
  posted: string[];
  error: string | null;
}

/** No-op unless SOCIAL_AUTO_POST=true. Never throws. Never posts drafts. */
export async function autoPostSocial(deal: Deal): Promise<SocialPostResult> {
  if (!socialAutoPostEnabled()) return { posted: [], error: null };
  if (deal.status !== "published") return { posted: [], error: null };

  const drafts = parseSocialDrafts(deal.socialPost);
  const posted: string[] = [];
  const errors: string[] = [];
  const xCreds = xCredentials();
  const igCreds = instagramCredentials();
  const fbCreds = facebookCredentials();

  if (drafts.x.trim()) {
    if (looksClonedWriteup(drafts.x)) {
      errors.push("X draft looks cloned — not posted.");
    } else if (xCreds) {
      try {
        await postToX(drafts.x, xCreds);
        posted.push("X");
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "X post failed.");
      }
    }
  }

  if (drafts.instagram.trim()) {
    if (looksClonedWriteup(drafts.instagram)) {
      errors.push("Instagram draft looks cloned — not posted.");
    } else if (igCreds) {
      const imageUrl = publicImageUrl(deal);
      if (!imageUrl) {
        errors.push("Instagram auto-post needs a public product photo.");
      } else {
        try {
          await postToInstagram(drafts.instagram, imageUrl, igCreds);
          posted.push("Instagram");
        } catch (error) {
          errors.push(error instanceof Error ? error.message : "Instagram post failed.");
        }
      }
    }
  }

  if (drafts.facebook.trim()) {
    if (looksClonedWriteup(drafts.facebook)) {
      errors.push("Facebook draft looks cloned — not posted.");
    } else if (fbCreds) {
      try {
        await postToFacebook(drafts.facebook, publicDealUrl(deal), fbCreds);
        posted.push("Facebook");
      } catch (error) {
        errors.push(error instanceof Error ? error.message : "Facebook post failed.");
      }
    }
  }

  return {
    posted,
    error: errors.length ? errors.join(" ") : null,
  };
}
