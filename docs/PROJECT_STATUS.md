# Project status

Verified 31 Aug 2026 against this repo, https://actuallydeals.com, https://actually-deals.vercel.app, and https://github.com/ActuallyDeals/actually-deals (`a14d3d5`, 29 Aug 2026).

## What is live (actuallydeals.com = Vercel GitHub app)

- Public grid feed, seed catalog, filters (All / Price Drops / Coupons / Amazon)
- `/deal/[slug]` client page (“Loading deal…”)
- Open `/admin` staff desk (no password): paste link, live preview, X post, Publish
- `/admin/settings` affiliate fields
- About / disclosure / privacy, sitemap, RSS
- Votes and comments exist in that codebase as **browser localStorage + optional `data/runtime.json`**
- `/admin` is reachable without login

## What this Origin branch has (hardening + this increment)

- Server store (`src/lib/store.ts`) with Supabase hook + file/memory fallback
- Cheerio parser that keeps the original URL when Walmart/Target bot-wall
- Password gate on `/admin`: a real `ADMIN_PASSWORD` env is required. Missing or empty env hard-fails (Unauthorized). No default password. Queue and desk stay hidden until a correct login cookie.
- Horizontal deal cards with working card-body click-through
- Seed catalog + Alive/Expired + comments on the server
- **Staff desk:** huge URL field is first and focused; paste auto-fills title/price/photo from the parser (Amazon usually photo+price; blocked merchants stay blank-price with a red strip). Why / stack / verify are three empty boxes required before Ready — no auto-filled commentary. Incoming → Draft → Ready is one click. Publish is still Mike’s button. Amazon outbound tag `actuallydea07-20`.
- **Social drafts (desk only):** X (number-first, short), Instagram (longer caption + `@actuallydeals_` + Associates line), Facebook (same notes, page name ActuallyDeals). Composed from our title/live price/merchant/why/stack/verify and the site deal URL after save. Copy per box. Stored on existing `socialPost` (plain X text, or a small JSON bundle when IG/FB are present). Not posted. No network APIs. Public UI unchanged.
- **Blocked scrapes:** merchant + canonical URL + best-effort title still fill; price stays blank; price + Image URL are the first staff fields; Publish waits for a real price
- **Product photos:** junk/logo/tiny thumbs rejected; Amazon CDN `_SCLZZZZZZZ_` / `_AC_SL1500_` preferred over merchant placeholders when a photo or ASIN exists
- **Logo:** original slate/emerald price-tag mark in header, favicon, apple-touch, and social images
- **Associates:** `/contact` (deals@actuallydeals.com) in the footer; exact Amazon Associate sentence in the footer on every page and next to Amazon Get Deal CTAs, plus the existing generic affiliate line
- **Associates price policy:** public Amazon cards/detail show “See price at Amazon”, not a hand-typed Amazon price or MSRP. Price Mistake is an editorial badge. Category slug is `price-mistakes`. Get Deal only fires on a product deep link, never a homepage.
- **Learn:** `/learn` plus how we pick a deal and how stacking works; About thickened; footer/header Learn link. No extra SKUs. Disclosure is not duplicated.
- **Per-deal editorial:** `/deal/[slug]` (and admin live preview) surfaces stored `summary` as Why this is good, stored stacking steps as How the stack works, and the last confirm/cart/checkout step as Verify in the cart. Empty fields are omitted — public pages never invent commentary. `/admin` requires all three notes before Ready. Incoming and Draft can stay blank. Publish remains Mike’s click.
- **House social:** X `@actuallydeals`, Instagram `actuallydeals_` (URL `https://www.instagram.com/actuallydeals_/`), Facebook `ActuallyDeals`. Canonical values live in `src/lib/social.ts` (footer, Contact, Organization JSON-LD `sameAs`, Twitter `site`). The domain stays `actuallydeals.com`.
- **Amazon Associates:** live Store ID `actuallydea07-20`. `attachAffiliate` appends `tag=actuallydea07-20` (env `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` / `AFFILIATE_AMAZON_TAG`, same tag). Do not use `actuallydeals-20`. Amazon public price policy is unchanged (See price at Amazon; no PA-API).
- **Public feed refine:** same Origin cards and colors, less chrome. Homepage is the chronological list (no SaaS hero, no “How we post” sidebar). Header is text links (Deals, Amazon, Learn, Contact). Cards: merchant · time, title, price/was, existing bullets, Get Deal. Detail puts Get Deal next to the price, then the original writeup. Admin desk unchanged.

## Salvage (31 Aug 2026)

deal-stack Origin was 403 from this agent. Unique live-app pieces this tree still lacked (toasts, microlink fallback, robots/sitemap/RSS, blueprint hover lift) were copied here. See `docs/SALVAGE.md`. deal-stack is the first cut of this company, not a second product, and is no longer a deploy target.

## Still open

- Origin preview target is https://actuallydeals.vercel.app via leftover Vercel project `actuallydeals` (no hyphen). Production domain remains the hyphenated GitHub project (`actually-deals` / actuallydeals.com) until cutover.
- Production Vercel is **not** this branch. GitHub last push is older and is what the domain serves.
- Production does not have `ADMIN_PASSWORD` or `SUPABASE_SERVICE_ROLE_KEY` in the GitHub `.env.example`.
- Live Vercel Get Deal links may still be untagged until that deploy points at this branch. Do not cut over from this increment. Origin Amazon links use `tag=actuallydea07-20`.
- Walmart, Target, Home Depot, and Best Buy often bot-wall. The desk still fills merchant, cleaned URL, and a title from the link. Staff must paste the live price and Image URL. Do not invent prices or generate lifestyle shots. Amazon usually returns a real photo and price.

## Mismatches

| Topic | Blueprint / docs | Live GitHub | This branch |
| --- | --- | --- | --- |
| Persistence | Supabase | localStorage + runtime.json | server store + optional Supabase |
| Admin lock | not specified | none | `ADMIN_PASSWORD` |
| Card layout | grid, h-52 image | grid | horizontal feed card (kept on purpose) |
| Env affiliate | `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` | same, unset | Amazon defaults to `actuallydea07-20` |
| Schema | merchants table + more deal flags | types only | deals/votes/comments; flags + `queue_stage` |
