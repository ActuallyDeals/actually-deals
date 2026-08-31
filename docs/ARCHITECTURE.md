# Architecture

Next.js 16 App Router, TypeScript, Tailwind, shadcn/ui, Node runtime for parse. Vercel is the intended host.

## I/O boundary

`src/lib/store.ts` is the only persistence API. It uses Supabase when `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set; otherwise `globalThis` plus `.data/store.json`.

The live GitHub app (`ActuallyDeals/actually-deals`) still uses browser `localStorage` plus `src/lib/server-db.ts` (`data/runtime.json`). That is a known split. This repo keeps the server store from the hardening run.

## Ingest

`POST /api/parse-deal` → `src/lib/parse-deal.ts`:

1. Clean tracking params.
2. Detect merchant and product id from the original URL (keep the original if the retailer redirects to a bot wall).
3. Scrape OG / JSON-LD when the page is reachable.
4. Resolve image: usable hi-res scrape (junk/logos rejected, Amazon thumbs lifted) → Amazon CDN ASIN plate → branded `/placeholders/{merchant}.svg`.
5. Run the copy engine (`src/lib/copy-engine.ts`) for headline, three Dan bullets, stacking steps, and the X post. Prices stay `null` when the scrape did not see them.

`src/lib/affiliate.ts` strips tracking and attaches tags from env (`AFFILIATE_*` or `NEXT_PUBLIC_*` aliases). Amazon defaults to Store ID `actuallydea07-20` (`NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` / `AFFILIATE_AMAZON_TAG`). Do not use `actuallydeals-20`. Other missing tags yield a clean merchant URL.

## Surfaces

| Route | Role |
| --- | --- |
| `/` | Published feed with All / Price Mistakes / Coupons / Amazon filters |
| `/deal/[slug]` | Detail, stacking steps, vote, comments, outbound CTA |
| `/admin` | Password-gated paste URL → parser preview → why/stack/verify → Incoming/Draft/Ready; Mike publishes |
| `/admin/settings` | Affiliate env status |
| `/about`, `/disclosure`, `/privacy`, `/contact` | FTC, house copy, deals@actuallydeals.com, and house social (X `@actuallydeals`, Instagram `actuallydeals_`, Facebook `ActuallyDeals`) |
| `/learn`, `/learn/how-we-pick`, `/learn/how-stacking-works` | Evergreen editorial, not SKUs |
| `POST /api/parse-deal` | Staff ingest (admin cookie; 401 if `ADMIN_PASSWORD` is unset) |
| `GET/POST /api/deals` | Public list / staff save |
| `GET /api/deals?queue=1` | Staff queue (admin cookie) |
| `PATCH /api/deals/[slug]` | Staff update / promote from queue |
| `POST /api/deals/[slug]/vote` | Alive / Expired |
| `POST /api/deals/[slug]/comments` | Comments |

## Cards

Keep the high-conversion card already in this repo: white card, slate canvas, emerald price, red Price Mistake badge, three bullets, full-width CTAs, whole-card link with independent Copy Code / Get Deal.
