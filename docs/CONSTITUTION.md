# Constitution

Operating rules for Actually Deals. These come from `BLUEPRINT.md` §1. If this file and the blueprint disagree, follow the blueprint.

1. The founder is a non-technical executive. Agents write the code, schema, and styling. Do not ask for stack or design permission on work the blueprint already specified.
2. Do not invent a new product. The site is a human-edited deal feed with a staff paste-to-publish desk, Alive/Expired voting, comments, and affiliate outbound links.
3. Do not invent sale prices or MSRPs. A blocked scrape leaves price fields blank for the editor.
4. Product photos use a standard `<img>` and the 3-tier resolver (scraped → Amazon CDN ASIN → branded placeholder). Never `next/image` for listing photos.
5. Persistence goes through one store boundary. Pages and routes do not talk to Supabase or the file store directly.
6. Do not add a second component library, an auth provider, or a second database.
7. Do not chain long recursive browser tests. Verify with `npx tsc --noEmit` and `npm run build`.
8. If a secret, Vercel env, DNS, or GitHub push is required, stop that thread and give the founder one exact action.
