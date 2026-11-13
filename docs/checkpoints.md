# Checkpoints

## Production

- App: https://chiriesigura.vercel.app (Vercel project `chiriesigura`, root `apps/web`, region `fra1`)
- Database: Neon Postgres `chiriesigura-db` (free, `fra1`), connected to the project. `DATABASE_URL` is set on Vercel by the integration.
- Env on Vercel: `PHONE_PEPPER` (team value, in the team chat), `NETWORK_MODE=mock`, `LOCATION_RADIUS_M=2000`, `NEXT_PUBLIC_APP_URL=https://chiriesigura.vercel.app`.
- Deploy: from the repo root, `vercel deploy --prod` (the GitHub repo isn't connected to Vercel, so pushes don't deploy).
- Migrations: `DATABASE_URL=<prod unpooled url> pnpm --filter @cs/web db:migrate`.
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

**Nokia (plan Task 14 Step 3):** not tried. There's no `NAC_TOKEN` yet. Once there is one, run `apps/web/scripts/nokia-smoke.ts`, then set the working `NETWORK_MODE_*` variables on Vercel to `nokia` and redeploy.

**Blockers:** none.

## Sun 15 Nov

- 12:00 feature freeze.
- 13:30 two timed rehearsals (each under 3:00), with `seed:prod` before each.
- 15:00 judging.
