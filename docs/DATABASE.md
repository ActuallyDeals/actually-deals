# Database

Canonical PostgreSQL shape from the product blueprint. Apply `supabase/migrations/001_init.sql`, `002_blueprint_fields.sql`, `003_queue_stage.sql`, and `004_price_mistakes_category.sql` in the Supabase SQL editor before pointing production at a live project.

The blueprint also names a `merchants` table. This repo stores merchant as a slug on `deals` (`amazon`, `walmart`, …) and does not require a merchants table to publish. Add merchants later if affiliate templates need per-row overrides.

## deals

| Column | Notes |
| --- | --- |
| id, slug, title | slug unique |
| merchant | slug, not a FK |
| merchant_product_id | ASIN / TCIN / SKU |
| source_url, affiliate_url | cleaned + tagged |
| scraped_image_url, image_url | 3-tier result |
| current_price, list_price | nullable until the editor fills a blocked scrape |
| promo_code | optional |
| bullets | jsonb string[3] |
| stacking_steps | jsonb |
| category | `amazon-finds` / `tech` / `home` / `apparel` / `price-mistakes` / `freebies` / `general` (editorial slug; not a tracker) |
| is_price_mistake, is_stacking_hack, is_featured | flags |
| social_post | X/Twitter copy |
| status | `draft` / `published` / `expired` |
| queue_stage | `incoming` / `draft` / `ready` on staff-only items; null when published |
| published_at, created_at, updated_at | timestamptz |

## deal_votes

One row per (`deal_id`, `voter_key`). `choice` is `alive` or `expired`. A deal is community-expired when expired votes are more than 70% of the total.

## deal_comments

`author_name`, `body`, `created_at`.

## Integrity

- Parser must not write a fabricated `current_price` or `list_price`.
- `affiliate_url` is always produced by `src/lib/affiliate.ts`.
- Seed data loads only when the store is empty.
