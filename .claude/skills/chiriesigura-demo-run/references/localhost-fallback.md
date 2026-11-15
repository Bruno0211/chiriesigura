# Localhost fallback for the demo

Use only when the user asks for a localhost run. Phones cannot reach localhost, so QR and landlord steps will not work.

- `apps/web/.env.local` must contain `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` and `APP_BASE_URL`. At the last check none were present.
- `http://localhost:3000/auth/callback` must be an allowed callback in the Auth0 tenant.
- Remove `NETWORK_MODE_NUMBER=nokia` from `apps/web/.env.local`. Nokia returns 404 IDENTIFIER_NOT_FOUND for the demo numbers, and the app then shows "We couldn't run this check".
- Run `pnpm --filter @cs/web db:migrate`, then the seed, then `pnpm dev:web`.
- Build the extension without `WXT_APP_URL`.
