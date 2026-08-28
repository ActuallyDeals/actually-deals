# Actually Deals

High-conversion deal desk for [actuallydeals.com](https://actuallydeals.com). Next.js 16 App Router, TypeScript, Tailwind, and a 1-paste admin studio.

The homepage is a Slickdeals-style feed with Hip2Save card density, Dan's Deals three-bullet breakdowns, and Glitched Deals urgency pills. Outbound clicks use cleaned affiliate URLs. The parser never invents a sale price.

## What ships in this slice

- Homepage grid with All / Price Errors / Coupon Stacks / Amazon filters and live search
- Deal cards with merchant pills, giant emerald prices, copy-code buttons, and FTC line
- Deal detail pages with stacking steps, alive/expired voting, and comments
- Admin desk: paste a URL → clean ASIN/tracking → live card + tweet preview → publish
- Local persistence so publishing, votes, and comments work before Supabase is connected

The cards on first load are an editorial sample catalog so the desk can be reviewed. They are not live retailer quotes.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:43147](http://127.0.0.1:43147).

```bash
npm run typecheck
```

## Affiliate tags

If `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` is set, Amazon links become `https://www.amazon.com/dp/{ASIN}?tag=...`. Other merchants use optional network redirect templates. Missing keys fall back to the cleaned merchant URL.

## Architecture

See `BLUEPRINT.md` for the full system contract and `DATABASE.md` for the PostgreSQL schema.
