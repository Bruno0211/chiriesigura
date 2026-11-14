# Listing Place Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A listing whose page says the flat is far from where the landlord verified gets a red badge (OLX, Storia, demo), and every green/amber badge names the city the landlord verified in.

**Architecture:** The extension reads the listing's place (text, and on Storia exact coordinates) through new `SiteAdapter` fields and sends it with the existing `GET /api/check`. The server compares it with `verification.lat/lng` (5 km with coordinates, 15 km with a looked-up place name) and passes `listingFar` into `decideBadge`. Verification stores the city Nominatim returns, and the green label says "near ‹city›".

**Tech Stack:** TypeScript, Next.js 16 route handlers, Drizzle + PGlite tests, WXT MV3 extension, Vitest + jsdom.

**Spec:** [docs/superpowers/specs/2026-11-14-listing-place-check-design.md](../specs/2026-11-14-listing-place-check-design.md)

## Global Constraints

- New status `red_far_away`, label exactly **"Listing is far from where the landlord verified"**.
- Limits: `MAX_LISTING_DISTANCE_M` (5000, existing) when the page gave coordinates; `MAX_PLACE_DISTANCE_M = 15_000` when only a place name was looked up.
- Unknown never punishes: no place, unparseable place, failed or empty lookup → `listingFar = false`.
- Only the city is ever shown, never the street address.
- The demo never calls Nominatim: demo place names resolve from `DEMO_LISTINGS`.
- English UI; "near", never "inside". Commit messages carry no Co-author lines. Stage only the folders you changed; never stage `.playwright-mcp/` or `.claude/`.

## Review Focus

1. **Nominatim slow, down or rate-limited** → the check answers within about 2 s and the badge is what it would have been. Pinned in Task 2.
2. **A verification row with no city** (made before this change) → green label keeps "near the address". Pinned in Tasks 1 and 3.
3. **Hostile query params** (a 5000-character `place`, `place=constructor`, `placeLat=abc`, `placeLat=999`) → ignored, no crash, status unchanged. Pinned in Task 3.
4. **Storia page without `__NEXT_DATA__`, malformed JSON, or non-numeric coordinates** → `placeCoords` null, no throw. Pinned in Task 4.
5. **A satellite town named only by text** (about 10 km from the verified address) → not far; just past 15 km → far. Pinned in Task 2.

---

### Task 1: Shared badge rule, label and extension display for `red_far_away`

**Files:**
- Modify: `packages/shared/src/types.ts`, `packages/shared/src/rules/badge.ts`, `packages/shared/src/api.ts`
- Modify: `apps/extension/lib/messages.ts` (`KNOWN`), `apps/extension/lib/badge-ui.ts` (`TONE`, `recordRows`), `apps/extension/entrypoints/background.ts` (`ACTION`)
- Test: `packages/shared/src/rules/badge.test.ts`, `apps/extension/lib/badge-ui.test.ts`, `apps/extension/lib/messages.test.ts`

**Interfaces:**
- Produces: `BadgeStatus` gains `'red_far_away'`; `BadgeInput.listingFar: boolean` (required); `badgeLabel(status: BadgeStatus, verifiedAt?: string, city?: string | null): string`; `CheckResponse.city?: string`.

- [ ] **Step 1: Write the failing tests** in `badge.test.ts` (existing inputs gain `listingFar: false`):
  - `'a listing far from the verified place is red_far_away'`: phone matches, registered listing, `listingFar: true` → `'red_far_away'`.
  - `'banned, copied and phone mismatch still win over far away'`: each with `listingFar: true` → `'red_banned'`, `'red_copied'`, `'red_phone_mismatch'`.
  - `'far away wins over amber'`: `listingFar: true` and `money_upfront: 2` → `'red_far_away'`.
  - `'the green label names the verified city'`: `badgeLabel('green', '2026-11-14T10:00:00Z', 'Timișoara')` → `'Verified landlord · near Timișoara · 14 Nov 2026'`; with `null` city → `'Verified landlord · near the address · 14 Nov 2026'`.
  - `badgeLabel('red_far_away')` → `'Listing is far from where the landlord verified'`.
  - Extension `badge-ui.test.ts`: rendering `{ status: 'red_far_away', label }` shows rows Code found · Passed "Code issued by ChirieSigură" · Passed "Registered to this listing" · Failed "Flat in the same area" with message **"Where this listing says the flat is, is far from where the landlord verified."**, plus the "Don't send a deposit" alert (the `default` panel branch).
  - Extension `messages.test.ts`: a reply with `status: 'red_far_away'` is accepted.
- [ ] **Step 2: Run** `pnpm --filter @cs/shared test` and `pnpm --filter @cs/extension test`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** In `decideBadge`, `if (i.listingFar) return 'red_far_away';` goes right after the phone-mismatch line. Add the label, the `city` parameter, `CheckResponse.city`, `KNOWN.red_far_away`, `TONE.red_far_away = 'fail'`, `ACTION.red_far_away = { text: '✕', color: '#b3261e' }`, and a `case 'red_far_away'` in `recordRows` before `default`.
- [ ] **Step 4: Run** `pnpm --filter @cs/shared test`, `pnpm --filter @cs/extension test`, and `pnpm --filter @cs/web test app/api/check` (the route still compiles because `listingFar` is not passed yet: pass `listingFar: false` there for now). Expected: PASS.
- [ ] **Step 5: Commit** `feat(shared): red_far_away badge and the verified city in the green label`

### Task 2: Place lookup and distance rule (web)

**Files:**
- Modify: `apps/web/lib/geocode.ts`, `apps/web/lib/listing-area.ts`
- Test: `apps/web/lib/listing-area.test.ts`, new `apps/web/lib/geocode.test.ts`

**Interfaces:**
- Produces:
  - `interface Geocoded { lat: number; lng: number; city: string | null }`; `geocode(address: string, timeoutMs?: number): Promise<Geocoded | null>` (default 10 000 ms). Nominatim query adds `addressdetails=1`; `city` = `address.city ?? address.town ?? address.village ?? null`. `DEMO_ADDRESSES` values gain `city: 'Timișoara'`.
  - `MAX_PLACE_DISTANCE_M = 15_000`; `interface PagePlace { text: string | null; coords: LatLng | null }`.
  - `lookupPlace(text: string): Promise<LatLng | null>`: a `DEMO_LISTINGS` entry whose `area` matches (case- and whitespace-insensitive) first, then an in-memory `Map` (caches hits and misses; `shortcut: per-instance cache, move to a table if Nominatim rate-limits Vercel`), then `geocode(text, 2000)`.
  - `listingFarFrom(page: PagePlace, at: LatLng): Promise<boolean>`: coordinates → `distanceM > MAX_LISTING_DISTANCE_M`; else text → `lookupPlace` → `distanceM > MAX_PLACE_DISTANCE_M`; else `false`.

- [ ] **Step 1: Write the failing tests** (stub `fetch` with `vi.stubGlobal`, never real network):
  - `geocode.test.ts`: `'returns the city Nominatim gives'`: response `[{ lat: '46.77', lon: '23.62', address: { city: 'Cluj-Napoca' } }]` → `{ lat: 46.77, lng: 23.62, city: 'Cluj-Napoca' }`; `address: { town: 'Lugoj' }` → city `'Lugoj'`; no address → city `null`. `'the demo apartment needs no network'`: `geocode('Strada Alba Iulia 2, Timișoara')` → city `'Timișoara'`, `fetch` not called.
  - `listing-area.test.ts`:
    - `'demo place names resolve without the network'`: `lookupPlace('cluj-napoca,  centru')` equals d7's coords (added in Task 5: until then assert on `'Lugoj, Centru'` = d6's coords), `fetch` not called.
    - `'coordinates use the 5 km limit'`: coords about 4 km from `at` → `false`; about 6 km → `true`.
    - `'a place name uses the 15 km limit'`: stub Nominatim to a point about 10 km from `at` → `false`; about 16 km → `true`.
    - `'unknown never punishes'`: `{ text: null, coords: null }` → `false`; `fetch` rejects → `false`; `fetch` returns `[]` → `false`.
    - `'a slow lookup gives up'`: `fetch` that only settles when its `signal` aborts (use fake timers, advance 2000 ms) → `false`.
    - `'lookups are remembered'`: two `lookupPlace('Oradea')` calls → `fetch` called once.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test lib/geocode lib/listing-area`. Expected: FAIL.
- [ ] **Step 3: Implement** the interfaces above. `geocode`'s fetch gets `signal: AbortSignal.timeout(timeoutMs)`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): look up a listing's place and measure it against the verified spot`

### Task 3: Store the city, compare in `/api/check`

**Files:**
- Modify: `apps/web/lib/db/schema.ts` (`verification.city`), new migration from `pnpm --filter @cs/web db:generate` (`drizzle/0003_*.sql`, one nullable `ADD COLUMN`), `apps/web/lib/queries.ts`, `apps/web/app/api/check/route.ts`, `apps/web/lib/test-seed.ts` (`seedVerified` sets `city: 'Timișoara'`)
- Test: `apps/web/app/api/check/check.test.ts`, `apps/web/app/api/verify/verify.test.ts`

**Interfaces:**
- Consumes: Task 1's `listingFar`, `badgeLabel(…, city)`, `CheckResponse.city`; Task 2's `listingFarFrom`, `Geocoded`.
- Produces: `IssuedVerification` gains `lat: number; lng: number; city: string | null`. `/api/check` reads query params `place`, `placeLat`, `placeLng`.

- [ ] **Step 1: Write the failing tests.** The seeded verification is at Timișoara (`seedVerified`, lat 45.7489 / lng 21.2087):
  - `'a listing whose page says Lugoj is far away'`: `{ ...d1, code: 'VC-7K3Q', place: 'Lugoj, Centru' }` → `{ status: 'red_far_away', label: 'Listing is far from where the landlord verified' }`, no `verificationId`.
  - `'page coordinates win over the place name'`: `place: 'Lugoj, Centru', placeLat: '45.75', placeLng: '21.21'` → `'green'`.
  - `'a nearby place stays green and names the city'`: `place: 'Timișoara, Centru'` → `{ status: 'green', label: 'Verified landlord · near Timișoara · 14 Nov 2026', city: 'Timișoara' }`.
  - `'a verification without a city keeps the old label'`: set `city` to null → label `'Verified landlord · near the address · 14 Nov 2026'`, no `city` field.
  - `'hostile place params are ignored'`: each of `place` = 5000 × `'a'`, `place: 'constructor'`, `placeLat: 'abc', placeLng: '21'`, `placeLat: '999', placeLng: '21'` → `'green'`, and `fetch` (stubbed) not called for the 5000-character one.
  - `verify.test.ts`: the existing successful identity test also asserts the stored verification's `city` is `'Timișoara'`.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test app/api/check app/api/verify`. Expected: FAIL.
- [ ] **Step 3: Implement.** Add the column and generate the migration. `findVerificationByCode` selects `lat`, `lng`, `city`. In the route: `place` = trimmed param, `null` if empty or longer than 200 characters; `placeLat`/`placeLng` used only if both parse to finite numbers within ±90 / ±180. `listingFar = v ? await listingFarFrom({ text: place, coords }, v) : false`. Green/amber responses add `city` when not null; `badgeLabel(status, v?.verifiedAt, v?.city)`. The identity route already spreads `...coords` into the insert, so it stores `city` with no change; confirm it compiles.
- [ ] **Step 4: Run** `pnpm --filter @cs/web test`. Expected: PASS (all web tests).
- [ ] **Step 5: Commit** `feat(web): store the verified city and flag listings far from it`

### Task 4: Extension reads the place

**Files:**
- Modify: `apps/extension/lib/adapters.ts`, `apps/extension/lib/extract.ts`, `apps/extension/lib/urls.ts`, `apps/extension/lib/badge-ui.ts` (`landlordChecks` footer)
- Test: `apps/extension/lib/extract.test.ts`, `apps/extension/lib/urls.test.ts`, `apps/extension/lib/badge-ui.test.ts`

**Interfaces:**
- Consumes: Task 3's query params `place`, `placeLat`, `placeLng`; Task 1's `CheckResponse.city`.
- Produces: `SiteAdapter.placeSelector?: string`; `SiteAdapter.placeCoords?: (doc: Document) => { lat: number; lng: number } | null`; `Extracted.place: string | null`; `Extracted.placeCoords: { lat: number; lng: number } | null`; exported `storiaCoords(doc: Document)`.

- [ ] **Step 1: Find the selectors on real ads** (Chrome, read-only, don't accept cookie banners):
  - OLX: the element inside `[data-testid="aside"]` that holds the city and county lines (seen: "Timisoara" / "Timis"). Pick the most stable selector and put a one-line comment with the date it was checked.
  - Storia: place = `a[href="#map"]` (seen: "Zona Soarelui, Timisoara, Timis"). Coordinates = `JSON.parse(#__NEXT_DATA__).props.pageProps.ad.location.coordinates` (`latitude`, `longitude`, seen 45.73587 / 21.249695). Phone: the element that appears after "Afișează numărul" is clicked; add it as Storia's `phoneSelector`.
  - Demo: `[data-testid="place"]` (added in Task 5).
- [ ] **Step 2: Write the failing tests** (existing `Extracted` fixtures gain `place: null, placeCoords: null`):
  - `extract.test.ts`: `'reads the place as one line'`: an OLX-shaped fixture with the city and county as two block elements → `place: 'Timisoara, Timis'`. `'no place element → null'`. `'reads Storia coordinates'`: fixture with `<script id="__NEXT_DATA__">` holding the path above → `{ lat: 45.73587, lng: 21.249695 }`. `'bad Storia data → null'`: no script, `'{not json'`, and `latitude: 'x'` → `null`, no throw.
  - `urls.test.ts`: `checkUrl` adds `place`, `placeLat`, `placeLng` when present and omits them when null.
  - `badge-ui.test.ts`: green and amber with `city: 'Timișoara'` → the landlord's checks footer contains `near Timișoara`; without `city` → no "near" text in the footer.
- [ ] **Step 3: Run** `pnpm --filter @cs/extension test`. Expected: FAIL.
- [ ] **Step 4: Implement.** `place` = the element's lines (use the existing `lineText`), trimmed, empty lines dropped, joined with `', '`, or `null`. `placeCoords` = `adapter.placeCoords?.(doc) ?? null`. Storia's adapter gets `placeCoords: storiaCoords`; `storiaCoords` wraps parsing in try/catch and requires finite numbers.
- [ ] **Step 5: Run** `pnpm --filter @cs/extension test`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(extension): read where the listing says the flat is`

### Task 5: Demo listing d7, seed, demo page and pitch Q&A

**Files:**
- Modify: `apps/web/lib/demo-listings.ts` (d7), `apps/web/app/demo/listing/[id]/page.tsx` (place element), `apps/web/scripts/seed.ts`, `docs/pitch.md`
- Test: `apps/web/scripts/seed.test.ts`, `apps/web/lib/listing-area.test.ts` (switch Task 2's demo-place assertion to d7)

**Interfaces:**
- Consumes: Task 3's `verification.city`, Task 4's demo `placeSelector: '[data-testid="place"]'` (add it to `demoAdapter` here if Task 4 left it out).

- [ ] **Step 1: Write the failing tests.**
  - `seed.test.ts`: `'seeds a verified landlord whose d7 listing says Cluj'`: after `seed(db)`, `findVerificationByCode(db, 'VC-CLJ7')` has `city: 'Timișoara'` and listings `[{ site: 'demo', listingId: 'd7' }]`; the landlord's `phoneHash` is `phoneHash('+40700000011')`; running `seed(db)` twice leaves one such verification. Also: the `VC-7K3Q` and `VC-BAN5` verifications have `city: 'Timișoara'`.
  - `listing-area.test.ts`: `lookupPlace('Cluj-Napoca, Centru')` equals `DEMO_LISTINGS.d7.coords`.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test scripts/seed lib/listing-area`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - d7 in `DEMO_LISTINGS`: title `'Apartament 2 camere, zona Centru, Cluj-Napoca'`, price `'400 €/lună'`, area `'Cluj-Napoca, Centru'`, rooms `'2 camere · 55 m² · etaj 3/4'`, contact `'Radu'`, phone `'+40 700 000 011'`, coords `{ lat: 46.7712, lng: 23.6236 }`, description ending with the paste line `Proprietar verificat · ChirieSigură VC-CLJ7`, comment `// A real code on a flat in another city: the place check turns it red.`
  - Demo page meta line: wrap `l.area` in `<span data-testid="place">`.
  - Seed: a `seedFarListing(db, appUrl, now)` in the style of `seedScammer`: landlord `+40700000011` (no ID fingerprints needed), verification `VC-CLJ7` at `DEMO_APARTMENT` with its coordinates and `city: 'Timișoara'`, listing demo/d7; idempotent. The existing demo verifications get `city: 'Timișoara'`. Update the final console line to mention `VC-CLJ7 on demo:d7 (far away)`.
  - `docs/pitch.md`: a new `## Q&A` section after the script with: **"Can a verified landlord list any flat?"** → "He'd need his real ID, and the badge compares where the listing says the flat is with where the network found him. Open d7: a real code on a flat in Cluj → 🔴 *Listing is far from where the landlord verified*. A different flat in the same city is what the ANCPI ownership check closes." The timed script does not change.
- [ ] **Step 4: Run** `pnpm -r test`. Expected: PASS across shared, extension and web.
- [ ] **Step 5: Commit** `feat(web): d7 demo listing in another city, seeded for the Q&A`

### After all tasks

- Rebuild the extension for production (`WXT_APP_URL=https://chiriesigura.vercel.app pnpm --filter @cs/extension build`), reload it in Chrome, run `seed:prod` after deploy, and check d1 (🟢 "near Timișoara") and d7 (🔴) in the browser. The deploy, seed and reload are outside the branch: ask before each.
