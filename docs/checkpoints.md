# Checkpoints

## Production

- App: https://chiriesigura.vercel.app (Vercel project `chiriesigura`, root `apps/web`, region `fra1`)
- Database: Neon Postgres `chiriesigura-db` (free, `fra1`), connected to the project. `DATABASE_URL` is set on Vercel by the integration.
- Env on Vercel: `PHONE_PEPPER` (team value, in the team chat), `NETWORK_MODE=mock` (to go live, see "Going live on Nokia" below), `LOCATION_RADIUS_M=2000`, `NEXT_PUBLIC_APP_URL=https://chiriesigura.vercel.app`, and for student sign-in `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL=https://chiriesigura.vercel.app`.
- Deploy: automatic. A push to `main` deploys production, and every pull request gets a preview URL. Previews have **no database** (it's connected to production and development only, so a PR can't touch the demo data): their pages render, but API calls fail. Manual fallback: `vercel deploy --prod` from the repo root.
- Migrations: automatic. Every production deploy runs `apps/web/scripts/migrate.ts` before `next build`, so a merged PR with a new migration applies it. Migrations land before the new code goes live, so keep them additive (add columns or tables; don't drop or rename in the same PR). Manual fallback: `DATABASE_URL=<prod unpooled url> pnpm --filter @cs/web db:migrate`.
- Demo reset: create `apps/web/.env.prod.local` (gitignored) with `DATABASE_URL`, `PHONE_PEPPER` and `NEXT_PUBLIC_APP_URL`, then run `pnpm --filter @cs/web seed:prod`. **Gotcha:** `vercel env pull` writes `PHONE_PEPPER="[SENSITIVE]"`; replace it with the real value. The seed refuses the placeholder.
- Extension: `WXT_APP_URL=https://chiriesigura.vercel.app pnpm --filter @cs/extension build`, then load `apps/extension/.output/chrome-mv3` unpacked in Chrome.

## Sat 14 Nov: spec §8 demo end to end on production, mock mode

Run by API calls from a script, not yet by hand on real phones.

| Step | Result |
|---|---|
| Seed (reset) | ✅ d1 🟢 with 2 earlier no-shows, d4 free |
| Landlord `0700000001`: number, KYC, SIM swap, location at `Strada Alba Iulia 2, Timișoara` | ✅ all pass, "Your phone is at the address" |
| Landlord registers `/demo/listing/d4` | ✅ new code issued (`VC-HK7Z` in this run) |
| `d1` | ✅ 🟢 Verified landlord · near the address |
| `d2` (scammer's copy) | ✅ 🔴 Copied from a verified listing |
| `d3` | ✅ ⚪ Not verified |
| Student `0711111111` reports "didn't show up" on d1 | ✅ accepted, no-shows 2 → 3 |
| `d1` reload | ✅ 🟠 Verified, but warnings from viewers |
| Seed again | ✅ back to d1 🟢, d4 free |

**Still to do by hand:** load the extension in Chrome and click through the same run on two real phones (QR scan, badge on the page), then record the backup video.

**Going live on Nokia (all four checks, against Nokia's simulator):** probed 14 Nov with the production callback URL. Nokia's test plan only answers for simulated subscribers: real numbers (`+40700000001`, any Romanian SIM) get 402 "Test plan not allowed for this CSP" from KYC and SIM Swap, and 404 `IDENTIFIER_NOT_FOUND` from Location.

| Simulator number | Number Verification | SIM swapped (7 days / 1 hour) | Location | KYC (test identity) |
|---|---|---|---|---|
| `+99999992002` (demo landlord) | ✅ | swapped / clean | TRUE | ✅ |
| `+99999992000` (demo student) | ✅ | swapped / swapped | TRUE | ✅ |
| `+99999991001` | ❌ | clean / clean | TRUE | ✅ |
| `+99999991003` | ✅ | swapped / swapped | PARTIAL | ✅ |
| `+99999991000` | ✅ | swapped / swapped | FALSE | ✅ |

- KYC matches only Nokia's test identity: Zoltan Eszter, born 1995-03-12, ID `66666666q`.
- Location answers per number and ignores the area, so the 5 km listing area check is what ties a listing to a place.
- No number passes Number Verification with a clean 7-day SIM history, so production uses a 1-hour window (`NEXT_PUBLIC_SIM_SWAP_WINDOW_HOURS=1`). Unset, it stays 7 days.

To switch (Vercel project owner): for Production set `NETWORK_MODE=nokia`, `NAC_TOKEN` (Sensitive; it is a personal RapidAPI key, so every check counts against its quota) and `NEXT_PUBLIC_SIM_SWAP_WINDOW_HOURS=1`. Redeploy (the `NEXT_PUBLIC_` value is built into the pages), then run `seed:prod`. Rollback: set `NETWORK_MODE=mock`, delete the window variable, redeploy. The demo numbers pass in mock mode too.

**Listing area check:** at registration, a listing more than 5 km from the address where the network located the landlord is refused (`apps/web/lib/listing-area.ts`). Only demo listings are checked: OLX answers server-side page fetches with 403, so OLX and Storia listings register without an area check. That's a known gap; the next step is an extension-side check once `feat/ai-scan` is merged.

**Blockers:** none.

## Sun 15 Nov

- 12:00 feature freeze.
- 13:30 two timed rehearsals (each under 3:00), with `seed:prod` before each.
- 15:00 judging.
