# deal-stack salvage

deal-stack is the first cut of Actually Deals, not a second company. This session could not clone `origin.cursor.com/git/mike-margulis/deal-stack` (403). Comparison used the live successor instead: GitHub `ActuallyDeals/actually-deals` @ `a14d3d5` (same app as actuallydeals.com) versus this tree.

Do not delete the Origin deal-stack repo from an agent session.

## Copied into this tree (unique and still useful)

| Piece | Source | Why |
| --- | --- | --- |
| Publish / parse toasts (`sonner`) | Live AdminStudio | BLUEPRINT §7 / Milestone 2 |
| Microlink title/image fallback | Live `deal-ingest.ts` | Helps when the retailer HTML is blocked; still does not invent prices |
| `robots.ts`, `sitemap.ts`, `/rss.xml` | Live app | Public feed hygiene the live site already has |
| Card hover lift (`hover:-translate-y-0.5`, `shadow-md`) | BLUEPRINT §3 tokens | Applied to the existing horizontal card, not the live orange grid |

## Already present here (do not duplicate)

- `BLUEPRINT.md` (canonical text)
- `docs/*` written on this branch
- `.cursor/rules/actually-deals.mdc`
- Cheerio parser + bot-wall URL keep
- Server store + Supabase hook + `001` / `002` migrations
- Password `/admin`, card-body click-through, Copy Code / Get Deal split
- Feed filters, legal pages, copy engine, 70% expired

## Safe to ignore in deal-stack / live Phase-1 leftovers

- Browser `localStorage` + `server-db.ts` as the primary store
- Open staff desk with no password
- Orange grid card (`border-orange-100`, `hover:text-orange-600`) — drifts from BLUEPRINT emerald/slate
- Coupon modal, client-only vote/comment routes, `affiliate-client.ts`
- Seed catalog copy that invents “FREE after rebate” theater
- WordPress / REHub notes
- Treating deal-stack as a deploy target

## Founder action

Grant this agent (or merge yourself) read on Origin `mike-margulis/deal-stack` if a file-level diff against that exact repo is still required. I will not delete that repo.
