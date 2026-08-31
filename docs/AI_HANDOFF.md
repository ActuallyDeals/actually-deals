# AI handoff

Read in this order: `BLUEPRINT.md`, `.cursor/rules`, `docs/PROJECT_STATUS.md`, this file, `docs/CONSTITUTION.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SALVAGE.md`.

## Do not do

- Do not stand up a second product or a WordPress/REHub port.
- Do not invent prices when a retailer blocks the scrape.
- Do not generate fake lifestyle shots of real products.
- Do not run long recursive browser QA.
- Do not assume GitHub, Vercel, and this Origin branch are the same commit. Check.
- Do not touch Vercel production cutover, DNS, or leftover deploys.

## Current split

- **Live domain** → GitHub `ActuallyDeals/actually-deals` on Vercel (`actually-deals.vercel.app`). Production actuallydeals.com stays there until cutover.
- **Origin preview** → leftover Vercel project `actuallydeals` (no hyphen) at https://actuallydeals.vercel.app, connected to this Origin repo. Do not attach the production domain here.
- **This repo** → Origin hardening branch with the stronger parser, server persistence, staff desk, and original logo. It is not what the domain serves until the founder points Vercel/GitHub at it.

## After this increment

Public pages were refined in place, not rebuilt: drop the homepage hero and sidebar, text-link header, quieter cards, Get Deal next to price on detail. Same logo, colors, components, writeups, Instagram `actuallydeals_`, Amazon tag `actuallydea07-20`. Do not start a from-scratch visual system. Do not restyle `/admin`.

Amazon Associates is active. The live tracking tag / Store ID is `actuallydea07-20`. `src/lib/affiliate.ts` appends `tag=actuallydea07-20` on Amazon outbound URLs (`NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` or `AFFILIATE_AMAZON_TAG`; default is that same Store ID). Do not use `actuallydeals-20`. Do not invent a second tag. PA-API and the Amazon “See price at Amazon” policy stay as they are.

House social handles are locked in `src/lib/social.ts`: X `@actuallydeals`, Instagram `actuallydeals_` (trailing underscore; `https://www.instagram.com/actuallydeals_/`), Facebook `ActuallyDeals`. Footer, Contact, Organization JSON-LD `sameAs`, and Twitter `site` use that module. Do not write Instagram as `actuallydeals` without the underscore. Do not change the X handle or `actuallydeals.com`.

Per-deal original analysis is now on `/deal/[slug]`: the stored `summary` is Why this is good, stored `stackingSteps` are How the stack works, and the last confirm/cart/checkout/vote-expired step is split out as Verify in the cart (`src/lib/editorial.ts`, `DealEditorial`). If a field is empty, that section is omitted. Public pages never invent a why note.

`/admin` is a 60-second desk: paste URL first (autofocus, large). Parser fills the preview immediately. Writeup is three short boxes (why / stack / verify) that start empty and stay empty until staff types. Ready is blocked until all three are filled (client + `store.ts`). Incoming and Draft do not require them. Queue sidebar is one-click next stage (Incoming → Draft → Ready). Publish is still Mike’s click and is not auto-fired. Do not auto-fill those three boxes from the copy engine. A real `ADMIN_PASSWORD` must be set or `/admin` is Unauthorized — there is no default `actually` password and the queue is not loaded.

Social drafts are copy-only: after title, live price, merchant, and the three notes, `/admin` shows three editable boxes — X (number-first, short), Instagram (slightly longer, `@actuallydeals_`, Associates disclosure), Facebook (same notes, page name ActuallyDeals). Copy per box. Stored on existing `socialPost`. No X/IG/FB APIs. No auto-post. Rebuild from notes overwrites with our fields only — never competitor copy or merchant affiliate URLs. The deal page URL is added after the first Incoming / Draft / Ready save.

Do not rebuild Learn, Contact, Amazon see-price, public UI, logo, or slugs. Do not invent SKUs, prices, or commentary to fill empty fields.

Evergreen editorial still lives under Learn: `/learn/how-we-pick` and `/learn/how-stacking-works`. About, Contact, Associates sentence, Amazon “See price at Amazon”, queue desk, logo, and filter slugs from prior increments are unchanged.

Out of scope and still not built: clone-and-swap of other accounts’ posts, auto-post to X/IG/FB, Vercel cutover. Amazon Associates is already active — do not file a second application.

deal-stack is retired as a live project. Do not deploy it. Do not delete the Origin repo from an agent.

## Founder clicks still needed

1. Point the repo Vercel already deploys (GitHub `ActuallyDeals/actually-deals` or Origin `mike-margulis/actually-deals`) at this branch.
2. Set `ADMIN_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG=actuallydea07-20` on Vercel when you point that deploy at this branch. Do not use `actuallydeals-20`.
3. Run `supabase/migrations/001_init.sql`, `002_blueprint_fields.sql`, `003_queue_stage.sql`, and `004_price_mistakes_category.sql` in the Supabase SQL editor.
4. On blocked retailers (usually Walmart, Target, Home Depot, Best Buy), paste the live price and the product Image URL yourself. Amazon usually does not need this. Do not invent either.

Agents cannot attach the domain, Amazon Associates, or GitHub from this environment.
