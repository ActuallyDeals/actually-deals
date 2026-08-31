# MASTER ARCHITECTURE BLUEPRINT: ACTUALLY DEALS (actuallydeals.com)

## Role: Lead Full-Stack Architect & Principal Systems Engineer
## Target Stack: Next.js 16 (App Router, TypeScript), Tailwind CSS, Supabase (PostgreSQL), Vercel, Cloudflare

---

### 1. AUTONOMOUS AGENT OPERATING CONTRACT (STRICT GUARDRAILS)

You are the autonomous Lead Architect building Actually Deals. The founder is a non-technical executive. You must execute all code, database schemas, and styling without infinite loops or token waste.

1. **Anti-Token-Burn Protocol:**
   - Never chain autonomous recursive tests or background browser smoke-tests that run longer than 20 seconds.
   - Do not refactor unrelated files or directories. Touch only files relevant to the active milestone.
   - Run `npx tsc --noEmit` to verify type safety. When green, halt execution and prompt the founder in plain English.
2. **Deterministic UI Standard:**
   - Never invent generic or bare-bones placeholder templates.
   - Use the high-density, high-conversion visual design matrix specified in Section 3.
3. **Data Integrity & Fallback Policy:**
   - Never invent fake sale prices or MSRPs.
   - If a retailer blocks scraping (403/Cloudflare/Akamai), leave the price fields blank in the admin form and highlight them for instant 2-second user entry.
   - For all product images, use standard HTML `<img>` tags to completely eliminate Next.js domain-whitelist crashes.

---

### 2. COMPETITIVE DESIGN DNA & BENCHMARK SYNTHESIS

Synthesize the proven monetization and UX mechanics of leading deal communities:

- **Dan’s Deals & Doctor of Credit:** High-trust, analytical deal breakdowns, multi-tier coupon-stacking steps, transparent historic price context.
- **Hip2Save & The Freebie Guy:** High-contrast card layouts, giant vibrant green pricing, store logo badges, high visual excitement without clutter.
- **Glitched Deals & Price Errors (@Pricerrors / @GlitchedDeals):** High-urgency alert pills (`[🚨 PRICE MISTAKE]`, `[🔥 90% GLITCH]`), countdown timers, "Alive vs. Expired" community voting.
- **Deals Finder & Slickdeals:** Fast client-side filtering, category pills, instant store search, sticky deal-action bars.

---

### 3. FRONTEND DESIGN SYSTEM & COMPONENT SPECIFICATIONS

#### Visual Tokens (Tailwind CSS)
- **Background Canvas:** Light Slate `#f8fafc` (`slate-50`)
- **Card Background:** Crisp White `#ffffff` with subtle border `border-slate-200/80` and smooth hover lift `shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`
- **Primary Action / Price Hero:** Emerald Green `#059669` (`emerald-600`)
- **Price Mistake / Urgency:** Crimson Red `#dc2626` (`red-600`) with subtle pulsing ping animation
- **Coupon Stack / Hack:** Indigo/Blue `#2563eb` (`blue-600`)
- **Store Badge:** Neutral Slate `#475569` (`slate-600`) in light gray pill `#f1f5f9`

#### Deal Card Component (`src/components/deals/DealCard.tsx`)
1. **Header Row:**
   - Merchant Pill (e.g., `[📦 Amazon]`, `[🏠 Home Depot]`, `[🎯 Target]`).
   - Relative Timestamp (e.g., `12m ago`).
   - Optional Urgency Badge: `[🚨 PRICE MISTAKE]` or `[⚡ COUPON STACK]`.
2. **Product Image Canvas:**
   - Centered container (`w-full h-52 bg-white flex items-center justify-center p-3 overflow-hidden`).
   - Standard `<img />` tag with `object-contain`, lazy loading, and automatic fallback to merchant placeholder on error.
3. **Pricing Hero Line:**
   - Giant Deal Price: `$19.99` (`text-3xl font-black text-emerald-600`).
   - Strikethrough MSRP: `$79.99` (`text-sm font-medium text-slate-400 line-through ml-2`).
   - Discount Pill: `[SAVE 75%]` (`bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full`).
4. **Headline:** Bold, 2-line clamped title linked to `/deal/[slug]` (`text-slate-900 font-bold hover:text-emerald-600 transition-colors`).
5. **Dan's Deals 3-Bullet Breakdown:**
   - 🏷️ **Price:** Historic low note or discount context.
   - 📦 **Shipping:** Free Prime / Store pickup / Threshold note.
   - ⚡ **How to get it:** Coupon clip instruction or promo code with a 1-click `[📋 Copy Code]` button.
6. **Primary Action CTA:**
   - Full-width button: `[ GET DEAL AT {MERCHANT} ↗ ]` (`bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-sm`).
   - Opens outbound affiliate URL in a new tab with `rel="noopener noreferrer nofollow"`.
7. **Footer Line:** Subtle FTC affiliate disclaimer on every card: `Affiliate link • Terms apply`.

---

### 4. DATA INGESTION & UNIVERSAL URL RESOLVER (`src/lib/deal-ingest.ts`)

Build a zero-friction backend parser at `POST /api/parse-deal`:

1. **Canonical URL Cleaner & ASIN Resolver:**
   - Strip all tracking junk (`tag=`, `ref=`, `linkCode=`, `ascsubtag=`, `utm_*`).
   - For Amazon links: Extract 10-digit ASIN and generate canonical URL (`https://www.amazon.com/dp/{ASIN}`).
2. **Three-Tier Image Resolution:**
   - **Tier 1:** OpenGraph / Schema.org image scraped from retailer metadata.
   - **Tier 2 (Amazon Direct CDN):** Auto-construct direct image path: `https://images-na.ssl-images-amazon.com/images/P/{ASIN}.01._SCLZZZZZZZ_.jpg`.
   - **Tier 3:** Merchant-branded fallback SVG/emoji tile.
3. **Automated Copy Engine:**
   - **Dan's Deals Headline:** `[Brand/Item Name] For Only $[Price] (Reg. $[MSRP]) After [Discount]% Off!`
   - **3-Bullet Summary:** Auto-construct Price, Shipping, and Action instructions.
   - **Social Post (X/Twitter):** High-urgency 280-char post formatted as:
     `🚨 PRICE DROP: [Item Name] is down to $[Price] (Was $[MSRP])! \n\nClip coupon on page \n\nGet it here: {DEAL_URL} #ad`
   - **House accounts:** X `@actuallydeals`, Instagram `actuallydeals_` (URL `https://www.instagram.com/actuallydeals_/`), Facebook `ActuallyDeals`. Instagram requires the trailing underscore. Do not change the X handle or the domain `actuallydeals.com`.

---

### 5. DYNAMIC AFFILIATE LINK INJECTION ENGINE (`src/lib/affiliate.ts`)

Ensure every outbound deal click is monetized via environment variables:

- **Amazon Associates:** Auto-append `?tag=actuallydea07-20` from `NEXT_PUBLIC_AMAZON_AFFILIATE_TAG` or `AFFILIATE_AMAZON_TAG` (same Store ID; default `actuallydea07-20`). Do not use `actuallydeals-20`.
- **Walmart / Target / Best Buy / Home Depot:** Wrap destination URLs with affiliate network redirects (Impact, CJ, Rakuten, Sovrn/Mavely) when keys are present.
- **Direct Fallback:** If no affiliate tag is configured, route cleanly to the raw cleaned merchant URL without breaking user experience.

---

### 6. SUPABASE DATABASE SCHEMA (`DATABASE.md` & Migrations)

Initialize PostgreSQL database schema for complete data persistence:

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

---

### 7. ADMIN STUDIO & 1-PASTE PUBLISHING DESK (`src/app/admin/page.tsx`)

Build an elite, single-screen control desk:

- **Top Bar:** Giant input: `[ 🔗 Paste Product URL ]` → `[ ⚡ Auto-Generate Deal Package ]`.
- **Form Controls (Side-by-Side with Live Preview):**
  - Clean title, Price, MSRP, Image URL (with instant live thumbnail refresh).
  - Promo code input with auto-detected discount calculations.
  - Category Selector: `[Amazon Finds, Tech, Home, Apparel, Price Errors, Freebies]`.
  - Toggles: `[🚨 Mark as Price Mistake]`, `[⚡ Stacking Hack]`, `[⭐ Feature on Homepage]`.
- **Instant Live Previews:**
  - Card Preview: Live responsive deal card updating in real time.
  - X Post Preview: Editable tweet box with character count counter and `[📋 Copy Tweet]` button.
- **Action:** Prominent `[ 🚀 Approve & Publish Deal ]` with green floating toast notification and instant persistence to Supabase (with fallback to local storage).

---

### 8. COMMUNITY GLITCH VOTING & DETAIL EXPERIENCE (`src/app/deal/[slug]/page.tsx`)

- **Full Deal Breakdown:** Complete step-by-step instructions (Step 1 → Step 2 → Final Checkout Price).
- **"Is Deal Still Alive?" Community Bar:**
  - Real-time voting buttons: `[👍 Still Alive ({count})]` and `[👎 Expired ({count})]`.
  - Visual confidence bar (e.g., "92% of users confirm this deal is active").
  - When downvotes exceed 70%, automatically add `[⚠️ Reported Expired]` badge.
- **Community Comments:** Simple, fast comment thread for stacking tips and deal confirmations.
- **FTC Legal Compliance Footer:** Mandatory explicit affiliate disclosure text on all pages.

---

### 9. IMPLEMENTATION MILESTONES FOR CURSOR

- **Milestone 1 (UI & Feed Architecture):** Homepage grid, filter tabs (All Deals, Price Errors, Coupon Stacks, Amazon), clean search, Dan's Deals bullet styling, and Deal Detail page.
- **Milestone 2 (Admin Engine & Parser):** Universal URL cleaner, ASIN CDN image extractor, live preview card studio, and floating publish toasts.
- **Milestone 3 (Supabase Data Layer):** Connect Supabase client, run schema migration, wire live deal feeds, and add alive/expired community voting.
- **Milestone 4 (Affiliate & Syndication):** Dynamic tag injection for Amazon/Walmart/Target and 1-click social copy generator.

Execute Phase 1 immediately. Ensure zero compile errors on `npx tsc --noEmit`.
