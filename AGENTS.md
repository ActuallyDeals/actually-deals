<!-- BEGIN:actuallydeals-cursor-rules -->

# Actually Deals — Cursor briefing

Hard product constraints live in `.cursor/rules/actually-deals.mdc` (always apply) and `.cursor/skills/actuallydeals-*/SKILL.md`.

You are expected to be better at coding than the agent that wrote those files. Treat them as **constraints and outcomes**, not a frozen recipe. If a cleaner design still satisfies the outcomes (no clone, full deal instructions, correct Amazon tag, no dead Rakuten SID, packed ship path, security invariants), do that.

<!-- END:actuallydeals-cursor-rules -->

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
