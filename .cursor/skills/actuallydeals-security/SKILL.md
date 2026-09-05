---
name: actuallydeals-security
description: Use when changing /admin auth, env secrets, HTTP headers, or security review.
---
# Security outcomes
- Empty ADMIN_PASSWORD locks desk. isAdmin on mutations. No NEXT_PUBLIC secrets. No Staff footer; /admin noindex.
- Keep nosniff / referrer / DENY frames / Permissions-Policy. Official social APIs only. Get Deal sponsored rel.
- Prefer stronger hardening if it doesn’t break Amazon CDN images or the desk.
