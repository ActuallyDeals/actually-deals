-- Blueprint flags, category, stacking steps, and social copy.
-- Safe to run after 001_init.sql.

alter table public.deals
  add column if not exists category text not null default 'general',
  add column if not exists is_stacking_hack boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists stacking_steps jsonb not null default '[]'::jsonb,
  add column if not exists social_post text;

alter table public.deals
  alter column current_price drop not null;
