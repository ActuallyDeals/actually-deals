# Actually Deals

Human-verified shopping deals for [actuallydeals.com](https://actuallydeals.com). Editors parse a merchant URL, write a three-bullet summary, and publish. The community votes **Alive** vs **Expired** and leaves field reports.

Read `BLUEPRINT.md`, then `docs/PROJECT_STATUS.md` and `docs/AI_HANDOFF.md`.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app listens on [http://127.0.0.1:43127](http://127.0.0.1:43127).

- Feed: `/`
- Deal pages: `/deal/[slug]`
- Editor desk: `/admin` (requires a real `ADMIN_PASSWORD`; no default) — paste a URL, edit overrides, publish or park in Incoming / Drafts / Ready

## Persistence

When `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set, deals, votes, and comments write to Supabase.

1. Create a Supabase project.
2. Run `supabase/migrations/001_init.sql`, `002_blueprint_fields.sql`, `003_queue_stage.sql`, and `004_price_mistakes_category.sql` in the SQL editor.
3. Copy the project URL and service role key into `.env.local`.

Without those keys the app uses a local file/memory store (`.data/store.json`) and ships a seed catalog so the feed is inspectable immediately.

## Affiliate tags

Amazon outbound links use Associates Store ID `actuallydea07-20` (`NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` or `AFFILIATE_AMAZON_TAG`). Do not use `actuallydeals-20`. Impact (Walmart, Target, Home Depot, Best Buy, Kohl's), CJ (Dick's, Office Depot, Booking.com, Expedia, Hotels.com), eBay, and Newegg/Rakuten wrap from `AFFILIATE_*` env IDs — see `.env.example`. Empty IDs produce clean merchant URLs with tracking stripped. Costco is not wrapped (no FlexOffers pattern in repo).

## Scripts

```bash
npx tsc --noEmit
npm run build
```
