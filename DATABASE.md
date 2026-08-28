# Actually Deals — PostgreSQL schema

Phase 1 renders the feed from `src/data/seed-deals.ts` and persists new posts, votes, and comments in the browser. When you add Supabase, run this SQL in the project SQL editor (or via the files in `supabase/migrations`).

```sql
-- MERCHANTS
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  logo_url TEXT,
  affiliate_template TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEALS
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  merchant_name TEXT NOT NULL,
  deal_url TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  deal_price NUMERIC(10, 2),
  msrp NUMERIC(10, 2),
  discount_percent INTEGER,
  coupon_code TEXT,
  bullets JSONB DEFAULT '[]'::jsonb,
  stacking_steps JSONB DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'general',
  is_price_error BOOLEAN DEFAULT FALSE,
  is_stacking_hack BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_expired BOOLEAN DEFAULT FALSE,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  posted_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- COMMUNITY VOTES & COMMENTS
CREATE TABLE deal_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  voter_ip_hash TEXT NOT NULL,
  is_alive BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, voter_ip_hash)
);

CREATE TABLE deal_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL DEFAULT 'Deal Hunter',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Integrity rules

- `deal_price` and `msrp` are nullable. A blocked scrape must leave them `NULL`.
- Never write a fabricated sale price from the parser.
- `affiliate_url` is produced by `src/lib/affiliate.ts` from the cleaned merchant URL.

## Environment

Copy `.env.example` to `.env.local` and fill only the keys you actually have. Missing affiliate tags fall back to the cleaned merchant URL.
