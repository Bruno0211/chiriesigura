# Checkpoints

## Production

- App: https://chiriesigura.vercel.app (Vercel project `chiriesigura`, root `apps/web`, region `fra1`)
- Database: Neon Postgres `chiriesigura-db` (free, `fra1`), connected to the project. `DATABASE_URL` is set on Vercel by the integration.
- Env on Vercel: `PHONE_PEPPER` (team value, in the team chat), `NETWORK_MODE=mock`, `LOCATION_RADIUS_M=2000`, `NEXT_PUBLIC_APP_URL=https://chiriesigura.vercel.app`, and for student sign-in `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL=https://chiriesigura.vercel.app`.
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

**Nokia (plan Task 14 Step 3):** probed 14 Nov with a `NAC_TOKEN` against Nokia's simulator. Location Verification answers per test number and ignores the area: `+99999991001` and `+99999992000` are TRUE for both Timișoara and Budapest, and `+99999991000` is FALSE for both. Real numbers (`+40700000001`, any Romanian SIM) get 404 `IDENTIFIER_NOT_FOUND`, which the app shows as "We couldn't run this check". To switch location to live: set `NETWORK_MODE_LOCATION=nokia` and `NAC_TOKEN` on Vercel, then redeploy. **Production stays on mock for the demo:** the demo numbers would 404, and the simulator's answer doesn't depend on where the phone is. The switch also covers the student's viewing report, which calls the same location check.

**Listing area check:** at registration, a listing more than 5 km from the address where the network located the landlord is refused (`apps/web/lib/listing-area.ts`). Only demo listings are checked: OLX answers server-side page fetches with 403, so OLX and Storia listings register without an area check. That's a known gap; the next step is an extension-side check once `feat/ai-scan` is merged.

**Blockers:** none.

## Sun 15 Nov

- 12:00 feature freeze.
- 13:30 two timed rehearsals (each under 3:00), with `seed:prod` before each.
- 15:00 judging.
