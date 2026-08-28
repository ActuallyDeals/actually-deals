# Actually Deals

Deal blog for actuallydeals.com. You post. Readers click, vote, and comment.

## What is already built

- Public feed and deal pages (The Freebie Guy / Hidden Clearances style)
- Staff desk at `/admin` — paste a product link, edit, publish
- Affiliate settings at `/admin/settings`
- Coupon popup, alive/expired votes, comments
- X/Twitter share copy generated for each deal
- Amazon tag appended on Get Deal when you save it

Readers never see a “post a deal” button.

## Run it

```bash
npm install
npm run dev
```

Open http://127.0.0.1:43147

Staff only: http://127.0.0.1:43147/admin

## When you wake up — only you can do these

1. **Publish the site** with the Publish button in Cursor (Vercel). I cannot attach your domain or Amazon account for you.
2. **Amazon Associates tag** — after Amazon approves you, open `/admin/settings` and paste `yourtag-20`.
3. **X / Twitter** — I cannot post to your account without developer keys. Until then, copy the share text from the staff desk after you publish a deal.
4. **WordPress + REHub** — skip unless you want to buy the paid REHub theme and WordPress hosting. This app is the same kind of deal portal without that purchase.

Walmart / Target / Macy’s network links can be added the same way later. Until then those buttons go to the clean store URL.
