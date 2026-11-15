---
name: network-as-code-nokia
description: Use when wiring Nokia Network as Code APIs, NAC_TOKEN, Location Verification, or LOCATION_RADIUS_M.
category: integration
---

# Nokia Network as Code in this repo

Every NaC call goes through a client built with `rapidapiHost: 'network-as-code.nokia.rapidapi.com'`. Without that header the gateway answers 404 "API doesn't exists" for every endpoint, so check it first.

- Number verification is a browser redirect, not a plain API call. Start returns the operator's authorize URL; the phone's browser goes there and comes back to `/api/nv/callback`.
- The redirect_uri must be identical in start and finish. Build it once in `nvCallbackUrl(req)` in `lib/nv-session.ts` and use it in both routes so they cannot drift.
- Finish exchanges the code at the token endpoint with the same redirect_uri, then calls `numberVerification.verifyV2` with the bearer token. Use v2.
- Keep the callback outcomes distinct: no code means the redirect never reached the operator (wifi); an `error` param means the person declined (fail).
- Cache the OAuth config as a promise, and clear the cache on failure so the next request retries.
- Switch all four checks from mock to live with `NETWORK_MODE=nokia` plus `NAC_TOKEN`. A per-check `NETWORK_MODE_NUMBER`, `NETWORK_MODE_KYC`, `NETWORK_MODE_SIMSWAP` or `NETWORK_MODE_LOCATION` overrides the global value for its check only, so leave those unset unless one check must differ. Mock stays the default. Vercel needs the same variables and a redeploy. `NEXT_PUBLIC_*` values (such as `NEXT_PUBLIC_SIM_SWAP_WINDOW_HOURS`) are built into the pages, so a deploy that started before the change still shows the old value.
- Location Verification (`location.verify`, `area` as CIRCLE, `maxAge`) answers per test number and ignores the area in the sandbox. Probed 2026-11-14: `+99999991001` and `+99999992000` are TRUE for both Timișoara and Budapest, `+99999991000` is FALSE for both. Real numbers such as `+40700000001` return 404 `IDENTIFIER_NOT_FOUND`. A sandbox pass proves the call shape, not that the location check works.
- SIM Swap answers are fixed per simulator number, and they change with the window. Probed 2026-11-14 with `simSwap.check` at `maxAge` 1, 24, 72, 168 and 240 hours: `+99999992002` is clean at 1 h and swapped at 24 h and longer; no number that passes Number Verification is clean at 168 h. So the 7-day rule cannot pass a live demo in the sandbox. Keep the 7-day default for real use and make the window configurable (`NEXT_PUBLIC_SIM_SWAP_WINDOW_HOURS`, set to 1 only for the simulator). Do not infer answers from `retrieveDate` (`latestSimChange`), which does not decide them.
- A live demo on a real Romanian SIM is refused by the sandbox: Nokia answers 402 "Test plan not allowed for this CSP" for KYC and SIM Swap and 404 for Location. Only Nokia's test numbers pass end to end, and the location answer ignores the address. Name these limits in any handoff or pitch.
- Going live, the user's direction: keep every check real and make a sandbox-blocked rule configurable, rather than mocking the check. A mock-only-one-check option was offered and declined.
- Probe from a script, not from the app: write it to the session scratchpad and run `npx tsx --env-file=.env.local <file>` from `apps/web`, loading `network-as-code` through `createRequire` on `apps/web/package.json`. List `Object.getOwnPropertyNames(Object.getPrototypeOf(nac.simSwap))` to find methods (`check`, `retrieveDate`). Print results only.
- Test the adapter with a mocked SDK and a stubbed `fetch`, asserting the host header, the redirect_uri in both steps, and the v2 call.

SDK surface, the flow steps, and the mock fixture numbers are in `references/nac-gateway-facts.md`.
