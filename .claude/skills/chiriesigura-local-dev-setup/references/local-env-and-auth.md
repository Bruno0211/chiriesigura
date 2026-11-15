# Local env keys and Auth0

Allowed in `apps/web/.env.local` for localhost:
- `PHONE_PEPPER`, `LOCATION_RADIUS_M`, `NEXT_PUBLIC_APP_URL` (copied from the main checkout, values never printed)
- `NETWORK_MODE=mock`
- `APP_BASE_URL=http://localhost:3000`
- `REVIEW_EMAILS=<reviewer Google email>`
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` left blank unless the user supplies them
- `AUTH0_SECRET` generated with `crypto.randomBytes(32).toString('hex')` inside the script

Removed on purpose: `DATABASE_URL` (forces the shared database), all `NETWORK_MODE_*` lines (they override mock mode).

Auth0 values live in the Auth0 dashboard (Applications, the Regular Web Application, Settings) and in Vercel env. `vercel env pull` writes `[SENSITIVE]` placeholders for some keys, so do not reuse its output for `PHONE_PEPPER`.

Verify the env file by key names only: `grep -o '^[A-Z0-9_]*=' apps/web/.env.local | tr '\n' ' '`. Confirm it is git-ignored with `git check-ignore -q apps/web/.env.local`.
