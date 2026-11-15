---
name: chiriesigura-demo-run
description: Use when running or seeding the ChirieSigură demo.
category: deployment
---

# ChirieSigură demo run

Run the demo against production (https://chiriesigura.vercel.app). Phones scanning the QR code cannot reach localhost, so only use localhost when the user asks for it.

1. Probe production first: `/demo/listing/d1`–`d4` return 200, `d5` and `d6` returned 404 in an older probe (d6 existed only in uncommitted changes). The 2026-11-14 probe, after the push and before any deploy, found `/demo` at 404 while `d1`, `d5`, `d6` and `/verify` returned 200, so re-probe every route each run instead of trusting these expectations, `/auth/login` redirects to Auth0, and `/api/check` returns 401 `signed_out` without a session. Each is expected.
2. Build the extension for production: `WXT_APP_URL=https://chiriesigura.vercel.app pnpm --filter @cs/extension build`. Output goes to `apps/extension/.output/chrome-mv3`. Before loading it, check that `manifest.json` `host_permissions` and content-script matches only name the production host, and that `grep -r localhost:3000` in the output finds nothing.
3. Run extension tests with `pnpm --filter @cs/extension test` (75 passed on the last run).
4. Sign in at `/auth/login` in the same Chrome profile. Until then the badge shows only "Sign in".
5. Expected badges: d1 🟢 verified (an open report adds only the soft note; the seeded d1 reports are `ok`, so d1 starts with no note; a ban turns it 🔴, and there is no 🟠 state); d2 🔴 copied from a verified listing; d3 ⚪ not verified; d4 ⚪ until the landlord registers it live. Check these against the rendered page, not from memory.
6. Reset production data only with the user's explicit approval. Create `apps/web/.env.prod.local` with `DATABASE_URL`, the real `PHONE_PEPPER` (never the `[SENSITIVE]` placeholder from `vercel env pull`), and `NEXT_PUBLIC_APP_URL`, then run `pnpm --filter @cs/web seed:prod`. The seed refuses the placeholder. The seed also moves the demo landlord to Nokia test number `+99999992002` and resets the ban demo (Mihai on `d5`, on hold). Until it runs, `d1` shows the new number against the old landlord, so its badge reads red (phone mismatch). Run it right after a production deploy that already has the Nokia variables.
7. A `wxt dev` server on port 3100 targets localhost. Disable that unpacked copy in the same Chrome profile before testing production.
8. Rehearsal reseed clears false-report bars in this order: first by `caseId` on the demo landlords' cases, then by the demo phone hashes, and only then delete the live report. A live false-report bar sits on the presenter's real Auth0 account hash, which the seed cannot compute, and deleting a case nulls its `caseId`, so the order matters.

For a localhost run, see references/localhost-fallback.md and the chiriesigura-local-dev-setup skill (worktree env file, local database, Auth0 blanks).
