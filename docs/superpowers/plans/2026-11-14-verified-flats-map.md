# Verified Flats Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A live map of Timișoara at `/map` (and `/`) showing every network-verified flat as a pin. Clicking a pin opens a card with the listing link, and a "⚠ N copy" tag appears when `/api/check` has caught copies of that flat's listing.

**Architecture:**
- `/api/check` records caught copies in a new `copy_sighting` table.
- `GET /api/map` returns the verified flats with approximate coordinates, status, listing details and copies.
- A client page draws them with MapLibre GL on OpenFreeMap tiles, polling every 15 s.
- The demo seed adds five more verified flats and clears the copies on each reset.

**Tech stack:** Next.js 16.4 (App Router, route handlers), Drizzle + Postgres/PGlite, `maplibre-gl`, Vitest, WXT extension (one small change).

**Spec:** `docs/superpowers/specs/2026-11-14-verified-flats-map-design.md`. Read it with this plan.

**Who:** Tasks 1, 3, 4, 5 and 6 are in `apps/web` / `packages/shared` (Bruno or Tin). Task 2 is in `apps/extension` (Track E). Task 2 can run in parallel with Task 1.

## Global Constraints

- Feature freeze **Sun 15 Nov 12:00**. Run `git pull --rebase` before each commit. **No `Co-Authored-By` lines.** Pushing to `main` deploys production.
- Migrations must be additive. Generate them with `pnpm --filter @cs/web db:generate`. Production deploys apply them.
- Read `apps/web/node_modules/next/dist/docs/` (route handlers, client components) before writing Next code (`apps/web/AGENTS.md`). `cacheComponents` is on.
- Never expose exact coordinates, `address_text`, landlord names or phone numbers from `/api/map` or the page.
- **Tiles:** MapLibre GL + OpenFreeMap style `https://tiles.openfreemap.org/styles/positron`, with the attribution visible. No `tile.openstreetmap.org`, no CARTO.
- **Copy (verbatim):**
  - header `ChirieSigură · Verified flats · Timișoara`
  - link `Open the listing →`
  - copy warning `⚠ A copy of this listing was caught. Don't contact it or send money.` + link `See the copy (to report it) →`
  - real-listing title fallback `Listing on OLX` (or `Listing on Storia`)
  - legend `Verified landlord` / `Verified, warnings from viewers` / `⚠ A copy of the listing was caught`
- **Colours:** green `#0f7a4a`, orange `#b26a00`, red `#b3261e`, bar `#2e2a8f`.

## Review Focus

1. **A landlord-registered listing URL like `javascript:alert(1)`, or one with HTML in it.** Expected: the popup shows no link for it and runs nothing. Pinned in Task 5 (`popup.test.ts`).
2. **A `url` parameter on `/api/check` that points at a different listing than `site`/`listingId`.** Expected: the sighting is stored with `url = null`. Pinned in Task 1.
3. **The same copy opened many times, by many students.** Expected: one sighting, and the tag stays "⚠ 1 copy". Pinned in Task 1.
4. **A verification with no listings** (the landlord verified but registered nothing, or the listing was removed). Expected: no pin. Pinned in Task 3.
5. **Exact location leaking.** Expected: `/api/map` never contains the stored `lat`/`lng` or `addressText`. Each pin is 50–150 m from the real point and stable across calls. Pinned in Task 3.

---

### Task 1: Record caught copies in `/api/check`

**Files:**
- Modify:
  - `packages/shared/src/rules/badge.ts`: export the amber rule as `isWarned`; `decideBadge` uses it.
  - `packages/shared/src/api.ts`: map contract, below.
  - `apps/web/lib/db/schema.ts`: `copySighting`.
  - `apps/web/app/api/check/route.ts`
- Create: the new migration in `apps/web/drizzle/` (generated)
- Test: `apps/web/app/api/check/check.test.ts` (extend)

**Interfaces — Produces:**
```ts
// shared badge.ts
export function isWarned(r: ReportCounts): boolean;
// shared api.ts
export interface MapListing { url: string; title: string | null; price: string | null; photo: string | null; area: string | null }
export interface MapCopy { site: Site; listingId: string; url: string | null }
export interface MapFlat { id: string; lat: number; lng: number; status: 'green' | 'amber'; label: string; listings: MapListing[]; copies: MapCopy[] }
export interface MapResponse { flats: MapFlat[] }
// schema.ts
export const copySighting  // id uuid pk, verificationId → verification.id ON DELETE CASCADE, site text, siteListingId text,
                           // url text NULL, firstSeenAt timestamptz default now(); unique('copy_once').on(verificationId, site, siteListingId)
```
`GET /api/check` gains an optional `url` query parameter. On `status === 'red_copied'`, insert a `copySighting` (on conflict do nothing). The stored `url` is:
- the given `url`, if it is `http(s)` and `parseListingUrl(url, appUrl)` equals the request's `site` + `listingId`;
- else, for `site === 'demo'`, `${NEXT_PUBLIC_APP_URL}/demo/listing/${listingId}`;
- else `null`.

The response body is unchanged.

- [ ] **Step 1: Write failing tests** (extend `check.test.ts`, which uses `seedVerified`):
  - `check({site:'demo', listingId:'d2', code:'VC-7K3Q'})` → exactly one `copySighting` row with `verificationId = seeded.verificationId`, `siteListingId 'd2'`, `url 'http://localhost:3000/demo/listing/d2'`.
  - Calling it 3 more times → still 1 row.
  - `check({site:'olx', listingId:'X1', code:'VC-7K3Q', url:'https://www.olx.ro/d/oferta/other-IDZZ9.html'})` (a URL for a different ID) → row with `url: null`.
  - A matching OLX URL is stored as given.
  - Green, `red_fake_code` and `grey_*` answers insert nothing.
  - The response JSON still never contains `url` or `copy`.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test app/api/check`. Expected: FAIL.
- [ ] **Step 3: Implement** `isWarned`, the contract types, the `copySighting` schema, then `pnpm --filter @cs/web db:generate`, then the route change.
- [ ] **Step 4: Run** `pnpm --filter @cs/shared test && pnpm --filter @cs/web test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): /api/check records copies of verified listings`.

### Task 2: Extension sends the page URL to `/api/check` (Track E)

**Files:** modify `apps/extension/lib/extract.ts` (`Extracted` gains `url: string`), `apps/extension/lib/urls.ts` (`checkUrl` adds `url`), and the tests `urls.test.ts` and `extract.test.ts`.

- [ ] **Step 1: Write failing tests:**
  - `checkUrl(APP, { listing:{site:'olx',listingId:'a1'}, code:'VC-7K3Q', phone:null, url:'https://www.olx.ro/d/oferta/x-IDa1.html' })` has the query parameter `url` equal to that URL.
  - `extractFromDocument(doc, URL, adapter, APP).url === URL`.
- [ ] **Step 2: Run** `pnpm --filter @cs/extension test`. Expected: FAIL.
- [ ] **Step 3: Implement** the field and the parameter. Update the test fixtures that build `Extracted` by hand.
- [ ] **Step 4: Run** `pnpm --filter @cs/extension test && pnpm --filter @cs/extension compile`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(extension): send the listing URL with /api/check`.

### Task 3: `GET /api/map`

**Files:**
- Create: `apps/web/lib/map.ts`, `apps/web/lib/map.test.ts`, `apps/web/app/api/map/route.ts`

**Interfaces — Consumes:** Task 1 (`copySighting`, `isWarned`, `MapResponse`); existing `landlordReportCounts`, `badgeLabel`, `DEMO_LISTINGS`.

**Interfaces — Produces:**
```ts
export function approximate(lat: number, lng: number, seed: string): { lat: number; lng: number };
export async function mapFlats(db: Db): Promise<MapFlat[]>;
// route.ts: GET → Response.json({ flats }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } })
```
**`approximate`:**
1. `h` = FNV-1a 32-bit of `seed`.
2. Angle = `h % 360` degrees; distance = `50 + ((h >>> 9) % 101)` metres.
3. `dLat = d·cos(θ)/111320`, `dLng = d·sin(θ)/(111320·cos(lat·π/180))`.

**`mapFlats`:**
- Verifications with `verifiedAt` not null and at least one listing.
- `status = isWarned(landlordReportCounts(landlordId)) ? 'amber' : 'green'`.
- `label = badgeLabel(status, verifiedAt.toISOString())`.
- Listings: for `site 'demo'`, take title, price, first photo and area from `DEMO_LISTINGS[siteListingId]`; otherwise all null.
- Copies from `copySighting`.

- [ ] **Step 1: Write failing tests** (`makeTestDb` + `seedVerified`; `@vitest-environment` default node):
  - **`approximate`:**
    - same seed → same point;
    - for 50 different seeds, the haversine distance to the input is ≥ 49 m and ≤ 151 m.
  - **`mapFlats`:**
    - after `seedVerified` → 1 flat, `status 'green'`, `label` starting `'Verified landlord · near the address'`, `listings[0].title === DEMO_LISTINGS.d1.title`;
    - after `addReports(db, vId, 'no_show', 3)` → `'amber'`;
    - a verification with no listing rows → not returned;
    - `JSON.stringify(flats)` contains neither the stored lat/lng digits nor `addressText` nor `'phone'`;
    - after inserting a `copySighting` for `d2` → `copies: [{ site:'demo', listingId:'d2', url: … }]`.
  - **Route:** `GET()` returns 200, `Cache-Control: no-store`, and a body of shape `{ flats: [...] }`.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test lib/map app/api/map`. Expected: FAIL.
- [ ] **Step 3: Implement** `lib/map.ts` and the route.
- [ ] **Step 4: Run** `pnpm --filter @cs/web test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): GET /api/map with approximate pins`.

### Task 4: Demo flats `d6`–`d10` and seed

**Files:**
- Modify:
  - `apps/web/lib/demo-listings.ts`: add `d6`–`d10`. The demo page's similar-listings block shows at most 3 cards.
  - `apps/web/lib/geocode.ts`: `DEMO_ADDRESSES` entries.
  - `apps/web/scripts/seed.ts`
  - `apps/web/scripts/seed.test.ts`

**Demo data:**

| id | Title | Price | Area | Code | Landlord phone | Coords |
|---|---|---|---|---|---|---|
| `d6` | Garsonieră renovată, Iosefin | 310 €/lună | Timișoara, Iosefin | `VC-M6TA` | `+40700000106` | 45.7478, 21.2098 |
| `d7` | Apartament 2 camere, Fabric | 420 €/lună | Timișoara, Fabric | `VC-M7TB` | `+40700000107` | 45.7586, 21.2413 |
| `d8` | Apartament 2 camere, Complex Studențesc | 400 €/lună | Timișoara, Complex Studențesc | `VC-M8TC` | `+40700000108` | 45.7468, 21.2372 |
| `d9` | Apartament 3 camere, Elisabetin | 520 €/lună | Timișoara, Elisabetin | `VC-M9TD` | `+40700000109` | 45.7448, 21.2262 |
| `d10` | Garsonieră, Circumvalațiunii | 290 €/lună | Timișoara, Circumvalațiunii | `VC-MATE` | `+40700000110` | 45.7631, 21.2079 |

- Each description ends with `pasteLine(code)`, and each page shows its landlord's phone, so the badge is 🟢.
- `d7` gets 3 `no_show` reports from `+40711111130`, `+40711111131` and `+40711111132`, which makes it 🟠.
- Photos reuse the ids already in the file.

**Seed additions** (idempotent, like the existing code):
- Delete **all** `copySighting` rows whose verification belongs to a demo landlord (the simplest version: delete all rows).
- Upsert the five landlords, their verifications (by code) and their listings.
- Insert `d7`'s reports.

- [ ] **Step 1: Write failing tests** (extend `seed.test.ts`):
  - after `seed(db)` → `mapFlats(db)` has 6 flats (`d1` + `d6`–`d10`), exactly 1 of them `amber` (`d7`'s flat);
  - after inserting a `copySighting` and running `seed(db)` again → 0 sightings;
  - the existing `d1`/`d2`/`d4` assertions still pass.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test scripts/seed`. Expected: FAIL.
- [ ] **Step 3: Implement** the data and the seed changes.
- [ ] **Step 4: Run** `pnpm --filter @cs/web test`. Expected: PASS. Then `pnpm --filter @cs/web seed` locally and check `/demo/listing/d6` renders.
- [ ] **Step 5: Commit** `feat(web): five more verified demo flats for the map`.

### Task 5: The `/map` page

**Files:**
- Create: `apps/web/app/map/page.tsx`, `apps/web/app/map/MapView.tsx` (client), `apps/web/app/map/popup.ts`, `apps/web/app/map/popup.test.ts`, `apps/web/app/map/map.module.css`
- Modify: `apps/web/app/page.tsx` (→ `redirect('/map')`), `apps/web/package.json` (`pnpm --filter @cs/web add maplibre-gl`)

**Interfaces — Consumes:** Task 3 `MapFlat` / `MapResponse` from `@cs/shared`.

**Interfaces — Produces:**
```ts
// popup.ts (pure DOM, no innerHTML with data)
export function safeHref(url: string | null): string | null;          // only http:/https:, else null
export function popupContent(doc: Document, f: MapFlat): HTMLElement;  // the card in spec "Goals" 3
export function markerElement(doc: Document, f: MapFlat): HTMLElement; // green/orange dot + "⚠ N copy" tag when copies.length
```
**`MapView`:**
- In `useEffect`, `import('maplibre-gl')` and its CSS.
- Create the map centred on `[21.2270, 45.7525]`, zoom 13.5, style positron.
- `fetch('/api/map')` now and every 15 000 ms. Re-draw the markers (`new Marker({ element: markerElement(...) }).setPopup(new Popup().setDOMContent(popupContent(...)))`).
- Add the header bar and the legend with the verbatim copy.
- Popups never open on their own.

- [ ] **Step 1: Write failing tests** in `popup.test.ts` (`// @vitest-environment jsdom`):
  - **`safeHref`:**
    - `'javascript:alert(1)'` → null; `'data:text/html,x'` → null;
    - `'https://www.olx.ro/d/oferta/x-ID1.html'` → same;
    - `null` → null.
  - **`popupContent`:**
    - a flat whose listing title is `'<img src=x onerror=alert(1)>'` → the card's `textContent` contains that literal string, and the card has no `img[onerror]`;
    - a listing URL `javascript:…` → no `a` element for it;
    - a flat with 1 copy → the text contains `⚠ A copy of this listing was caught. Don't contact it or send money.` and `See the copy (to report it) →`;
    - a real-OLX listing (title null) → shows `Listing on OLX`.
  - **`markerElement`:** with 2 copies → text `⚠ 2 copy`; amber → its colour is `#b26a00`.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test app/map`. Expected: FAIL.
- [ ] **Step 3: Implement** `popup.ts`, `MapView.tsx`, `page.tsx`, the CSS and the `/` redirect.
- [ ] **Step 4: Run** `pnpm --filter @cs/web test && pnpm --filter @cs/web lint`. Expected: PASS. Then `pnpm dev:web` and open `http://localhost:3000/`:
  - it redirects to `/map`;
  - 6 pins appear after `pnpm --filter @cs/web seed`;
  - clicking `d1` shows its card, and "Open the listing →" opens `/demo/listing/d1`.
- [ ] **Step 5: Commit** `feat(web): live map of verified flats`.

### Task 6: End to end, deploy, pitch

- [ ] **Step 1:** `git pull --rebase && git push`. Production deploys and applies the migration. Then run `pnpm --filter @cs/web seed:prod`.
- [ ] **Step 2: Demo run on production:**
  - open `https://chiriesigura.vercel.app/` → map, 6 pins, `d7` orange;
  - with the extension built for production, open `/demo/listing/d2` (🔴 Copied); within 15 s, `d1`'s pin shows `⚠ 1 copy` and its card links to `d2`;
  - the landlord registers `d4` live → a new pin near `d1` within 15 s;
  - reseed → the copy tag and the `d4` pin are gone.
- [ ] **Step 3:** Post the pitch line to the pitch owner (closing ~10 s, spec "Intent"). In `docs/checkpoints.md`, log that the map is part of the demo reset (`seed:prod` clears copies).

## Verification (whole feature)

- `pnpm -r test` is green, and `pnpm --filter @cs/web lint` and `pnpm --filter @cs/extension compile` are clean.
- Task 6, Step 2 passes on production, including the live copy tag and the reseed reset.
