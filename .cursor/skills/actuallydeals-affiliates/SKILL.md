---
name: actuallydeals-affiliates
description: Use when wrapping Get Deal links, joining networks, or handling Amazon/Impact/CJ/eBay/Rakuten/Newegg/travel affiliates.
---
# Affiliate outcomes
- Amazon tag `actuallydea07-20` only. Empty other env IDs = clean URL. Never invent IDs.
- `attachAffiliate` in `src/lib/affiliate.ts`. Hard-block Rakuten SID `4745711`. Newegg untagged until a *new* SID exists.
- CJ PID `8059705` / member `7745283`. Travel + Dick’s/OD via CJ AIDs when set.
- FlexOffers 1559269 declined; HD Impact declined. No random brands. Legal name Michael Margulis. No SSN/EIN/bank in repo or chat.
