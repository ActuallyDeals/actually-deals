-- Actually Deals schema
-- Apply in the Supabase SQL editor or via the Supabase CLI.

create extension if not exists pgcrypto;

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  merchant text not null,
  merchant_product_id text,
  source_url text not null,
  affiliate_url text not null,
  scraped_image_url text,
  image_url text not null,
  current_price numeric(10, 2) not null,
  list_price numeric(10, 2),
  promo_code text,
  is_price_mistake boolean not null default false,
  bullets jsonb not null default '[]'::jsonb,
  summary text,
  status text not null default 'draft' check (status in ('draft', 'published', 'expired')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deal_votes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  voter_key text not null,
  choice text not null check (choice in ('alive', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deal_id, voter_key)
);

create table if not exists public.deal_comments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists deals_status_published_at_idx
  on public.deals (status, published_at desc);

create index if not exists deal_votes_deal_id_idx
  on public.deal_votes (deal_id);

create index if not exists deal_comments_deal_id_idx
  on public.deal_comments (deal_id, created_at desc);

alter table public.deals enable row level security;
alter table public.deal_votes enable row level security;
alter table public.deal_comments enable row level security;

drop policy if exists "public read published deals" on public.deals;
create policy "public read published deals"
  on public.deals for select
  using (status = 'published');

drop policy if exists "public read votes" on public.deal_votes;
create policy "public read votes"
  on public.deal_votes for select
  using (true);

drop policy if exists "public read comments" on public.deal_comments;
create policy "public read comments"
  on public.deal_comments for select
  using (true);

-- Writes go through the service-role key from Next.js route handlers.
