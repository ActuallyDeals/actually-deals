---
name: actuallydeals-tests
description: Use when adding or running unit/UI tests for parsers, affiliate wraps, clone gates, or /admin auth.
---
# Test outcomes
- `npx tsx scripts/verify-parser.mts` covers merchants, wrap on/off, dead Rakuten SID, clone gate, DoC live code, SD unwrap.
- Prefer expanding that suite over heavy new frameworks. No ADMIN_PASSWORD in fixtures. Optional later: homepage 200, /admin 401, robots disallow /admin.
