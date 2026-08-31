-- Staff desk Incoming / Drafts / Ready queue.
-- Safe to run after 002_blueprint_fields.sql.

alter table public.deals
  add column if not exists queue_stage text;

alter table public.deals
  drop constraint if exists deals_queue_stage_check;

alter table public.deals
  add constraint deals_queue_stage_check
  check (queue_stage is null or queue_stage in ('incoming', 'draft', 'ready'));

update public.deals
  set queue_stage = 'draft'
  where status = 'draft' and queue_stage is null;

update public.deals
  set queue_stage = null
  where status = 'published';
