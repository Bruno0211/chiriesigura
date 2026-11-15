---
name: chiriesigura-local-dev-setup
description: Use when setting up localhost, .env.local, or Auth0 login.
category: deployment
---

# ChirieSigură local dev setup

Run localhost only against a local database and the mock network. Never copy `DATABASE_URL` into a worktree and never migrate a branch against the shared database: branches here can drop columns the live app still reads.

Run every step from the worktree folder:

1. Free port 3000 first. Auth0 only accepts `localhost:3000`, so stop any dev server from the main checkout. Stopping a background `pnpm dev:web` task (TaskStop) can leave its node child on port 3000: find the owning PID and stop it with the `dev-server-port-cleanup` skill before starting again. To reseed a running local DB, stop the server, run step 5, then restart `pnpm dev:web`.
2. Build `apps/web/.env.local` with a script that reads the main checkout's file and writes only the allowed keys. Keep `PHONE_PEPPER`, `LOCATION_RADIUS_M`, `NEXT_PUBLIC_APP_URL`. Drop `DATABASE_URL` and every `NETWORK_MODE_*` line. Set `NETWORK_MODE=mock` and `APP_BASE_URL=http://localhost:3000`. Add `REVIEW_EMAILS` with the reviewer's Google address. Details: `references/local-env-and-auth.md`.
3. Generate `AUTH0_SECRET` inside that script and never print it. Print only key names.
4. `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET` are not on the machine. Leave them blank, tell the user to fill them from the Auth0 dashboard, and say that `/auth/login` and `/check` return 500 until they do. That is expected, not a bug.
5. `pnpm --filter @cs/web db:migrate`, then `pnpm --filter @cs/web seed`. With no `DATABASE_URL` the app uses local PGlite. Seeded demo codes and mock phone numbers: `references/mock-fixtures.md`.
6. `pnpm --filter @cs/extension build`. Its manifest should show `host_permissions: ["http://localhost/*"]`, and its content-script `matches` must include `http://localhost/demo/listing/*` (print them with a `node -e` read of `.output/chrome-mv3/manifest.json`). In Chrome, load `apps/extension/.output/chrome-mv3` unpacked and disable any other ChirieSigură copy. After every rebuild, press reload on that unpacked entry in `chrome://extensions` and refresh the listing page, or Chrome keeps running the old build.
7. `pnpm dev:web` in the background. Wait for the `Ready in` line with one `until grep -q "Ready in" <output>` loop in a background Bash call. Do not poll.
8. Smoke-check with one curl per route, printing only the status code. Expect 200 for `/privacy`, `/demo/listing/d1`, `/demo/listing/d5`, `/review`. Expect 500 for `/check` and `/auth/login` until Auth0 is filled.

Production data and the production seed belong to `chiriesigura-demo-run`, not here.
