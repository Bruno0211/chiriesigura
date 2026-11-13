# ChirieSigură — Rental Trust Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Chrome extension that badges rental listings, backed by a Next.js app where landlords verify with Nokia Network as Code (KYC Match, SIM Swap, Location, Number Verification) and students file location-verified viewing reports.

**Architecture:** pnpm monorepo. `packages/shared` holds types, the API contract and all pure rules (URL parsing, code format, phone normalisation, badge decision). `apps/web` is Next.js App Router on Vercel: JSON API, mobile web pages, demo listing pages, Drizzle + Postgres, and a `lib/network` module that switches per API between Nokia and mock. `apps/extension` is a WXT MV3 extension that reads the listing page and renders a badge.

**Tech Stack:** TypeScript, pnpm workspaces, Next.js (App Router, latest), Drizzle ORM + Postgres (Vercel Marketplace provider; PGlite in tests), `network-as-code` (Nokia TS SDK), WXT, Vitest + jsdom, `qrcode`.

**Spec:** `docs/superpowers/specs/2026-11-13-rental-trust-layer-design.md`

## Team, tracks and timing

Task 1 is done first, together (everyone else sets up accounts meanwhile: Nokia Network as Code, Vercel, GitHub, Orange Playground as backup). After that the four tracks run in parallel and touch separate folders:

| Track | Owner | Tasks | Folder |
|---|---|---|---|
| **S — Shared rules** then **D — Demo & pitch** | Person 1 | 2, 13, 14 | `packages/shared/src/rules`, `apps/web/app/demo`, `apps/web/scripts`, `docs/pitch.md` |
| **C — Backend** | Person 2 | 3, 4, 5, 6, 7, 8 | `apps/web/lib`, `apps/web/app/api` |
| **P — Phone pages** | Person 3 | 9, 10, 11 | `apps/web/app/(phone)` |
| **E — Extension** | Person 4 | 12 | `apps/extension` |

Until Task 2 merges (~1.5 h), C and E import the rule functions from `@cs/shared` and accept that tests calling them fail; they work on DB/network/WXT scaffolding first.

**Checkpoints:** **Sat 14 Nov 18:00:** full demo (§8 of the spec) runs end-to-end in mock mode on the deployed URL. **Sun 15 Nov 12:00:** feature freeze. **Sun 13:30:** two full pitch rehearsals. **15:00:** judging.

## Global Constraints

- Package names: `@cs/shared`, `@cs/web`, `@cs/extension`. Node 22+. All code ESM TypeScript.
- Code format: `VC-` + 4 chars from alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I). Regex `/\bVC-[A-HJ-NP-Z2-9]{4}\b/i`; always stored and returned uppercase.
- Listing paste line, verbatim: `Proprietar verificat · ChirieSigură VC-XXXX`.
- Badge copy, verbatim from spec §6.2: `Can't confirm` · `Fake code` · `Copied from a verified listing` · `Phone number doesn't match the verified landlord` · `Verified landlord · near the address · <date>` · `Verified, but warnings from viewers` · `Not verified` · button `Ask the landlord to verify`. Report line: `<n> verified viewings: <ok> ✅ · <k> didn't show up` (list each non-zero category).
- SIM swap window: **168 hours** (7 days). Location: TRUE passes, PARTIAL passes with "near" note, FALSE/UNKNOWN fails. Radius: env `LOCATION_RADIUS_M`, default `2000`, set to the API minimum once known.
- Amber thresholds: `money_upfront >= 2` or `no_show >= 3` or `wrong_person >= 3`, counted across **all** of the landlord's verifications.
- KYC Match required fields: name, birthdate, idDocument. `not_available` on a required field = fail.
- Never persist: ID document number, name, birthdate, phone coordinates, raw phone numbers. Phones are stored only as `hmac-sha256(PHONE_PEPPER, e164)` hex.
- Never return landlord contact details from the API.
- Consent: every phone flow shows a consent screen naming the checks before any network call; API rejects requests without `consent: true` (400).
- Every network call goes through `apps/web/lib/network`. Per-API mode env vars `NETWORK_MODE_NUMBER|KYC|SIMSWAP|LOCATION` = `nokia|mock`, each defaulting to `NETWORK_MODE` (default `mock`).
- Phone pages must tell users to use **mobile data, not Wi-Fi**.
- Demo pages carry **no OLX branding**.

## Review Focus

1. **Listing URL variants** — the same OLX listing reached via `m.olx.ro`, with `?reason=...` query, or `#` fragment must parse to the same `listingId` (else a real landlord's own listing shows "Copied"). Test in Task 2.
2. **Phone formats on the page** — `0722 123 456`, `+40 722-123-456`, `0040722123456`, `(0722)123456` must normalise to `+40722123456` (else every verified listing shows "Phone number doesn't match"). Test in Task 2.
3. **Codes outside the description / lowercase codes** — a code in a "similar listings" widget must be ignored, and `vc-7k3q` typed by a landlord must be found as `VC-7K3Q`. Tests in Tasks 2 and 12.
4. **Duplicate viewing report** — the same phone reporting twice (or double-tapping submit) gets 409 and counts don't change. Test in Task 8.
5. **Number Verification on Wi-Fi** — Nokia returns a failure; the user must see "Switch to mobile data and try again", not a generic error. Test in Task 9.

---

### Task 1: Monorepo scaffold and API contract (everyone, first hour)

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`
- Create: `packages/shared/package.json`, `packages/shared/src/index.ts`, `packages/shared/src/types.ts`, `packages/shared/src/api.ts`, `packages/shared/vitest.config.ts`
- Create: `apps/web` via `pnpm create next-app@latest apps/web --ts --app --eslint --no-tailwind --src-dir=false --import-alias "@/*"` (Tailwind optional — owner's call)
- Create: `apps/extension` via `pnpm dlx wxt@latest init apps/extension --template vanilla`
- Test: `packages/shared/src/types.test.ts`

**Interfaces — Produces (everyone codes against these):**

```ts
// packages/shared/src/types.ts
export type Site = 'olx' | 'storia' | 'imobiliare' | 'demo';
export interface ListingRef { site: Site; listingId: string }
export type ReportCategory = 'ok' | 'no_show' | 'mismatch' | 'money_upfront' | 'wrong_person';
export const REPORT_CATEGORIES: readonly ReportCategory[];
export type ReportCounts = Record<ReportCategory, number>;
export const emptyCounts: () => ReportCounts;
export type LocationResult = 'TRUE' | 'PARTIAL' | 'FALSE' | 'UNKNOWN';
export type BadgeStatus =
  | 'green' | 'amber'
  | 'red_fake_code' | 'red_copied' | 'red_phone_mismatch'
  | 'grey_unverified' | 'grey_cannot_confirm';

// packages/shared/src/api.ts
// GET /api/check?site=&listingId=&code=&phone=   (all optional strings)
export interface CheckResponse {
  status: BadgeStatus;
  label: string;                 // verbatim badge copy
  verificationId?: string;       // present for green/amber (for the viewing QR)
  verifiedAt?: string;           // ISO
  locationResult?: 'TRUE' | 'PARTIAL';
  reports?: ReportCounts;        // present for green/amber when any report exists
}
// POST /api/verify/identity
export interface IdentityRequest { consent: true; givenName: string; familyName: string; birthdate: string /*YYYY-MM-DD*/; idDocument: string; address: string }
export type CheckStepName = 'number' | 'kyc' | 'simswap' | 'location';
export interface CheckStep { name: CheckStepName; ok: boolean; message: string }
export interface IdentityResponse { ok: boolean; steps: CheckStep[]; verificationId?: string }
// POST /api/verify/location
export interface LocationRequest { verificationId: string }
export interface LocationResponse { ok: boolean; step: CheckStep }
// POST /api/verify/listings
export interface ListingsRequest { verificationId: string; urls: string[] }
export interface ListingsResponse { code?: string; pasteLine?: string; accepted: ListingRef[]; rejected: { url: string; reason: 'unparseable' | 'already_registered' }[] }
// POST /api/viewing/report
export interface ReportRequest { consent: true; verificationId: string; category: ReportCategory }
export interface ReportResponse { ok: boolean; reason?: 'not_at_address' | 'already_reported' | 'not_number_verified'; counts?: ReportCounts }
// Number Verification: GET /api/nv/start?phone=<raw>&next=<path>  → 302; GET /api/nv/callback → 302 to next with ?nv=ok|fail|wifi
```

- [ ] **Step 1:** Create root workspace (`packages/*`, `apps/*`), `tsconfig.base.json` (strict, `module`/`target` `esnext`, `moduleResolution` `bundler`), root scripts `test` = `pnpm -r test`, `dev:web`, `dev:ext`. `git init`, push to a new GitHub repo, all four clone.
- [ ] **Step 2:** Write `types.test.ts`: `expect(REPORT_CATEGORIES).toEqual(['ok','no_show','mismatch','money_upfront','wrong_person'])` and `expect(emptyCounts()).toEqual({ok:0,no_show:0,mismatch:0,money_upfront:0,wrong_person:0})`. Run `pnpm --filter @cs/shared test` → FAIL.
- [ ] **Step 3:** Write `types.ts` and `api.ts` exactly as above; re-export from `index.ts`. Add `@cs/shared: workspace:*` to web and extension. Run → PASS.
- [ ] **Step 4:** `.env.example` with `DATABASE_URL`, `PHONE_PEPPER`, `NETWORK_MODE=mock`, `NETWORK_MODE_NUMBER`, `NETWORK_MODE_KYC`, `NETWORK_MODE_SIMSWAP`, `NETWORK_MODE_LOCATION`, `NAC_TOKEN`, `LOCATION_RADIUS_M=2000`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Verify `pnpm dev:web` serves the Next start page and `pnpm dev:ext` loads an empty extension in Chrome.
- [ ] **Step 5:** Commit `chore: monorepo scaffold and API contract`.

---

### Task 2: Shared rules — URL parsing, codes, phones, badge decision (Track S)

**Files:**
- Create: `packages/shared/src/rules/listing-url.ts`, `code.ts`, `phone.ts`, `badge.ts` (+ `*.test.ts` beside each); export from `index.ts`

**Interfaces — Produces:**
```ts
parseListingUrl(url: string, demoOrigin?: string): ListingRef | null
listingKey(ref: ListingRef): string                       // `${site}:${listingId}`
CODE_ALPHABET: string; generateCode(rand?: () => number): string
findCode(text: string): string | null                     // first match, uppercased
pasteLine(code: string): string
normalizeRoPhone(raw: string): string | null              // E.164 '+40…' or null
interface BadgeInput {
  listing: ListingRef | null; code: string | null;
  verification: { listings: ListingRef[]; phoneHash: string; verifiedAt: string } | null; // null = code unknown
  pagePhoneHash: string | null; reports: ReportCounts;
}
decideBadge(i: BadgeInput): BadgeStatus
badgeLabel(status: BadgeStatus, verifiedAt?: string): string
reportLine(c: ReportCounts): string | null                // null when no reports
AMBER_THRESHOLDS: { money_upfront: 2; no_show: 3; wrong_person: 3 }
```

- [ ] **Step 1: Failing tests for `parseListingUrl`:**
  - `https://www.olx.ro/d/oferta/apartament-2-camere-IDhXyZ1.html` → `{site:'olx', listingId:'hXyZ1'}`
  - same with `m.olx.ro`, with `?reason=hp_promoted`, with `#gallery` → same ref (Review Focus 1)
  - `https://www.storia.ro/ro/oferta/apartament-2-camere-IDabc12` → `{site:'storia', listingId:'abc12'}`
  - `${demoOrigin}/demo/listing/d1` with `demoOrigin='http://localhost:3000'` → `{site:'demo', listingId:'d1'}`
  - `https://example.com/x`, `not a url`, OLX URL without `-ID…` → `null`
  - imobiliare.ro: owner saves one real listing URL from the site into the test, expects its numeric/alphanumeric ID (stretch; if skipped, imobiliare returns `null`).
- [ ] **Step 2:** Run `pnpm --filter @cs/shared test` → FAIL. Implement with `new URL()`; host match on `olx.ro`/`storia.ro`/`imobiliare.ro` suffix; OLX/Storia ID = text after the last `-ID` in the pathname, stripped of `.html`. Run → PASS.
- [ ] **Step 3: Failing tests for codes:** `generateCode(() => 0)` matches the regex and equals `'VC-AAAA'`; 1000 generated codes all match `/^VC-[A-HJ-NP-Z2-9]{4}$/`; `findCode('Proprietar verificat · ChirieSigură vc-7k3q')` → `'VC-7K3Q'` (Review Focus 3); `findCode('VC-0O1I')` → `null`; `findCode('no code')` → `null`; `pasteLine('VC-7K3Q')` → `'Proprietar verificat · ChirieSigură VC-7K3Q'`. Implement, run → PASS.
- [ ] **Step 4: Failing tests for `normalizeRoPhone`:** each of `'0722 123 456'`, `'+40 722-123-456'`, `'0040722123456'`, `'(0722)123456'`, `'+40722123456'` → `'+40722123456'` (Review Focus 2); `'123'` → `null`; `'+33612345678'` → `'+33612345678'` (non-RO E.164 passes through). Implement (strip non-digits except leading `+`; `00`→`+`; leading `0` + 9 digits → `+40`), run → PASS.
- [ ] **Step 5: Failing tests for `decideBadge`** (one test per spec §6.2 rule, in order), with `L1={site:'demo',listingId:'d1'}`, `L2={site:'demo',listingId:'d2'}`, `V={listings:[L1], phoneHash:'h1', verifiedAt:'2026-11-14T10:00:00Z'}`:
  - `listing:null, code:'VC-7K3Q'` → `'grey_cannot_confirm'`
  - `listing:L1, code:'VC-7K3Q', verification:null` → `'red_fake_code'`
  - `listing:L2, verification:V` → `'red_copied'`
  - `listing:L1, verification:V, pagePhoneHash:'h2'` → `'red_phone_mismatch'`
  - `listing:L1, verification:V, pagePhoneHash:null` → `'green'`; with `pagePhoneHash:'h1'` → `'green'`
  - green input with `reports.no_show=3` → `'amber'`; `no_show=2` → `'green'`; `money_upfront=2` → `'amber'`; `wrong_person=3` → `'amber'`
  - `code:null, listing:L1` → `'grey_unverified'`; `code:null, listing:null` → `'grey_unverified'`
- [ ] **Step 6:** Implement `decideBadge`, `badgeLabel` (verbatim copy from Global Constraints; date formatted `dd MMM yyyy`, e.g. `14 Nov 2026`), `reportLine` (test: `{ok:3,no_show:1,…0}` → `'4 verified viewings: 3 ✅ · 1 didn't show up'`; all-zero → `null`). Category labels for `reportLine`: `no_show` "didn't show up", `mismatch` "doesn't match the listing", `money_upfront` "asked for money first", `wrong_person` "wrong person". Run → PASS.
- [ ] **Step 7:** Commit `feat(shared): listing URL, code, phone and badge rules`.

---

### Task 3: Database schema, phone hashing, test DB (Track C)

**Files:**
- Create: `apps/web/lib/db/schema.ts`, `apps/web/lib/db/index.ts`, `apps/web/lib/db/test-db.ts`, `apps/web/lib/hash.ts`, `apps/web/drizzle.config.ts`
- Test: `apps/web/lib/db/schema.test.ts`, `apps/web/lib/hash.test.ts`

**Interfaces — Produces:**
```ts
// schema.ts (Drizzle pg-core), ids are uuid default random
landlord        { id, phoneHash unique, numberVerifiedAt, kycMatchedAt, simCheckedAt, createdAt }
verification    { id, landlordId → landlord, code unique nullable, addressText, lat double, lng double,
                  locationResult text nullable ('TRUE'|'PARTIAL'), verifiedAt nullable, createdAt }
listing         { id, verificationId → verification, site, siteListingId, url, createdAt } unique(site, siteListingId)
viewingReport   { id, verificationId → verification, reporterPhoneHash, locationResult, category, createdAt }
                  unique(verificationId, reporterPhoneHash)
// index.ts
export type Db = /* drizzle instance type */; export function getDb(): Db   // Neon/Postgres via DATABASE_URL
// test-db.ts
export async function makeTestDb(): Promise<Db>   // PGlite in-memory + migrations applied
// hash.ts
export function phoneHash(e164: string): string   // hmac-sha256(PHONE_PEPPER) hex
```

- [ ] **Step 1:** Provision Postgres via the Vercel Marketplace on the team's Vercel project (load the Vercel marketplace skill if using Claude Code); `vercel env pull apps/web/.env.local`. Add `drizzle-orm`, `drizzle-kit`, `@electric-sql/pglite`, Postgres driver for the chosen provider.
- [ ] **Step 2: Failing tests:** `hash.test.ts` — same input → same hash; different pepper → different hash; output is 64 hex chars; throws if `PHONE_PEPPER` unset. `schema.test.ts` (using `makeTestDb`) — inserting two `listing` rows with same `(site, siteListingId)` throws; two `viewingReport` rows with same `(verificationId, reporterPhoneHash)` throws; two verifications with the same non-null code throws, two with null code succeed.
- [ ] **Step 3:** Run `pnpm --filter @cs/web test` → FAIL. Implement schema, `drizzle-kit generate`, `makeTestDb`, `phoneHash`. Run → PASS. Run `drizzle-kit migrate` against the real DB.
- [ ] **Step 4:** Commit `feat(web): db schema and phone hashing`.

---

### Task 4: Network module — mock and Nokia, per-API switch (Track C)

**Files:**
- Create: `apps/web/lib/network/index.ts`, `mock.ts`, `nokia.ts`, `mock-fixtures.ts`
- Test: `apps/web/lib/network/network.test.ts`

**Interfaces — Produces:**
```ts
export type MatchValue = 'true' | 'false' | 'not_available';
export interface KycInput { givenName: string; familyName: string; birthdate: string; idDocument: string }
export interface KycResult { name: MatchValue; birthdate: MatchValue; idDocument: MatchValue }
export interface Network {
  kycMatch(phone: string, input: KycInput): Promise<KycResult>;
  simSwapped(phone: string, maxAgeHours: number): Promise<boolean>;
  verifyLocation(phone: string, area: { lat: number; lng: number; radiusM: number }): Promise<LocationResult>;
  numberVerificationStart(phone: string, redirectUri: string, state: string): Promise<string>; // URL to redirect the phone to
  numberVerificationFinish(phone: string, code: string, state: string): Promise<'ok' | 'fail' | 'wifi'>;
}
export function network(): Network   // composes per-API mode from env
export function kycPasses(r: KycResult): boolean  // all three === 'true'
```
Mock fixtures (also used by the seed and demo — keep in sync with Task 13):
| Phone | Behaviour |
|---|---|
| `+40700000001` | landlord: all pass, location TRUE |
| `+40700000002` | SIM swapped |
| `+40700000003` | KYC `idDocument: 'false'` |
| `+40700000004` | location FALSE |
| `+40700000005` | location PARTIAL |
| `+40700000006` | Number Verification → `'wifi'` |
| `+40711111111`…`+40711111119` | students: all pass, location TRUE |
| any other | all pass, location TRUE |
Mock `numberVerificationStart` returns `${redirectUri}?code=mock&state=${state}` directly.

- [ ] **Step 1: Failing tests** (mock mode): one test per fixture row above asserting the documented result; `kycPasses` false when any field is `'not_available'`; with `NETWORK_MODE=mock` and `NETWORK_MODE_LOCATION=nokia`, `network()` uses the Nokia implementation for `verifyLocation` only (assert via a spy on the nokia module).
- [ ] **Step 2:** Run → FAIL. Implement `mock.ts`, `index.ts`. Run → PASS.
- [ ] **Step 3:** Implement `nokia.ts` with `npm i network-as-code`, client from `NAC_TOKEN`. Read https://networkascode.nokia.io/docs for exact SDK calls for SIM Swap (verify with max age), Location Verification, KYC Match and Number Verification (authorization-code redirect + verify). Map Nokia's Wi-Fi / non-mobile-network error to `'wifi'`. Map location results to `LocationResult`.
- [ ] **Step 4:** Smoke script `apps/web/scripts/nokia-smoke.ts`: with `NETWORK_MODE=nokia`, call `simSwapped` and `verifyLocation` for one Nokia simulator number from the NaC dashboard; print results. Run `pnpm tsx scripts/nokia-smoke.ts` → prints results without throwing. (If the mentor gives no access, record that in `docs/checkpoints.md` and stay on mock.)
- [ ] **Step 5:** Commit `feat(web): network module with per-API nokia/mock switch`.

---

### Task 5: Number Verification flow — `/api/nv/start`, `/api/nv/callback`, session cookie (Track C)

**Files:**
- Create: `apps/web/app/api/nv/start/route.ts`, `apps/web/app/api/nv/callback/route.ts`, `apps/web/lib/nv-session.ts`
- Test: `apps/web/lib/nv-session.test.ts`, `apps/web/app/api/nv/nv.test.ts`

**Interfaces — Produces:**
```ts
// nv-session.ts — signed (HMAC with PHONE_PEPPER), httpOnly cookie 'nv', 15 min TTL
export function issueNvCookie(e164: string): string           // Set-Cookie value
export function readNv(req: Request): { e164: string } | null  // null if missing/expired/tampered
```
Routes: `start` normalises `phone` (400 if invalid), stores `{e164, next}` in a short-lived signed `nv_state` cookie, redirects to `network().numberVerificationStart(...)` with `redirectUri = ${NEXT_PUBLIC_APP_URL}/api/nv/callback`. `callback` calls `numberVerificationFinish`; on `'ok'` sets `nv` cookie; always 302 to `next` with `?nv=ok|fail|wifi`. `next` must start with `/` (open-redirect guard).

- [ ] **Step 1: Failing tests:** cookie round-trips; tampered cookie → `null`; expired (fake timers +16 min) → `null`. Route tests (call the route handlers directly with `Request`): mock mode `start?phone=0700000001&next=/verify` → 302 whose chain lands on `/verify?nv=ok` with `nv` cookie set; phone `+40700000006` → `/verify?nv=wifi` and no `nv` cookie; `next=https://evil.com` → 400; `phone=abc` → 400.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Commit `feat(web): number verification flow`.

---

### Task 6: `GET /api/check` (Track C)

**Files:**
- Create: `apps/web/app/api/check/route.ts`, `apps/web/lib/queries.ts`
- Test: `apps/web/app/api/check/check.test.ts`

**Interfaces:**
- Consumes: `decideBadge`, `badgeLabel`, `normalizeRoPhone`, `findCode` (Task 2); `phoneHash`, `makeTestDb` (Task 3).
- Produces (`queries.ts`, also used by Tasks 7, 8, 13):
```ts
findVerificationByCode(db: Db, code: string): Promise<{ id: string; landlordId: string; listings: ListingRef[]; phoneHash: string; verifiedAt: string; locationResult: 'TRUE'|'PARTIAL' } | null> // only issued codes
landlordReportCounts(db: Db, landlordId: string): Promise<ReportCounts>   // across all the landlord's verifications
```
Route: parses query (`site`+`listingId` → `ListingRef` only if `site` is a valid `Site` and `listingId` non-empty), uppercases `code`, hashes normalised `phone` if present, calls `decideBadge`, returns `CheckResponse`. Response header `Access-Control-Allow-Origin: *` (extension background fetch). Never returns phone or address. Phone is never logged.

- [ ] **Step 1: Failing tests** against a seeded test DB (landlord `+40700000001`, verification code `VC-7K3Q`, listing `demo:d1`): one request per badge status from Task 2 Step 5 yields that status and the verbatim label; green response contains `verificationId` and no key named `phone`, `phoneHash` or `address`; 3 `no_show` reports on a *second* verification of the same landlord make `demo:d1` amber (spec: reports attach to the landlord).
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Commit `feat(web): /api/check badge endpoint`.

---

### Task 7: Landlord verification API — identity, location, listings (Track C)

**Files:**
- Create: `apps/web/app/api/verify/identity/route.ts`, `.../location/route.ts`, `.../listings/route.ts`, `apps/web/lib/geocode.ts`
- Test: `apps/web/app/api/verify/verify.test.ts`

**Interfaces:**
- Consumes: `readNv` (Task 5), `network()`, `kycPasses` (Task 4), `parseListingUrl`, `generateCode`, `pasteLine`, `listingKey` (Task 2), schema (Task 3).
- Produces: `geocode(address: string): Promise<{lat:number; lng:number} | null>` — checks `DEMO_ADDRESSES` map first (exported; Task 13 adds the demo apartment), else Nominatim (`User-Agent: ChirieSigura-hackathon`).

Behaviour:
- `identity`: 400 without `consent:true`; 401 without `nv` cookie. Runs KYC then SIM swap (168 h). Steps array always lists `number` (ok, from cookie), `kyc`, `simswap` with plain-English messages (`"Your ID details don't match this phone number's owner"`, `"This SIM was changed in the last 7 days"`). On success upserts `landlord` by phone hash (sets timestamps), geocodes address (fail → step `location` not ok, `"We couldn't find that address"`), inserts `verification` without code, returns `verificationId`. Never writes name/birthdate/idDocument anywhere.
- `location`: 401 if `nv` phone ≠ the verification's landlord. Calls `verifyLocation` with the verification's lat/lng and `LOCATION_RADIUS_M`; stores TRUE/PARTIAL; FALSE/UNKNOWN → `ok:false`, message `"Your phone isn't near this address. Open this page at the apartment, on mobile data."`.
- `listings`: 409 if location not passed. Parses each URL; rejects unparseable and URLs whose `(site, listingId)` is registered to any verification (`already_registered`). If ≥1 accepted and the verification has no code: generate a unique code (retry on unique violation), set `verifiedAt`. Returns `code` and `pasteLine`. Re-calling adds more listings to the same code.

- [ ] **Step 1: Failing tests:** happy path with `+40700000001` returns code matching the regex and `pasteLine`; `+40700000002` → `ok:false` with `simswap` step not ok and no verification row; `+40700000003` → `kyc` not ok; `+40700000004` → location `ok:false`, then `listings` → 409; `+40700000005` → location ok with stored `'PARTIAL'`; missing consent → 400; no nv cookie → 401; listing URL already registered by another landlord → in `rejected` with `already_registered`; `'not a url'` → `unparseable`; after the happy path, the DB contains no column value equal to the given name, birthdate or ID number (scan all text columns).
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Commit `feat(web): landlord verification API`.

---

### Task 8: `POST /api/viewing/report` (Track C)

**Files:**
- Create: `apps/web/app/api/viewing/report/route.ts`
- Test: `apps/web/app/api/viewing/report.test.ts`

**Interfaces:** Consumes `readNv`, `network()`, `phoneHash`, `landlordReportCounts`. Produces the `ReportRequest/ReportResponse` contract from Task 1.

Behaviour: 400 without consent or with a category not in `REPORT_CATEGORIES`; `not_number_verified` (401) without `nv`; 404 unknown verification; location check against the verification's lat/lng — FALSE/UNKNOWN → `not_at_address` (403), nothing stored; insert report; unique violation → `already_reported` (409). Returns landlord-wide `counts`.

- [ ] **Step 1: Failing tests:** student `+40711111111` reports `no_show` → 200, counts `no_show:1`; same phone again with `ok` → 409 `already_reported` and counts unchanged (Review Focus 4); two parallel identical requests → exactly one 200 and one 409; student `+40700000004` (location FALSE) → 403 `not_at_address`, no row; category `'spam'` → 400.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Commit `feat(web): viewing report endpoint`.

---

### Task 9: Phone page shell — consent screen and Number Verification step (Track P)

**Files:**
- Create: `apps/web/app/(phone)/layout.tsx`, `apps/web/app/(phone)/components/ConsentScreen.tsx`, `NumberStep.tsx`, `StepList.tsx`
- Test: `apps/web/app/(phone)/components/components.test.tsx` (Vitest + Testing Library + jsdom)

**Interfaces — Produces:**
```tsx
<ConsentScreen checks={CheckStepName[]} onAccept={() => void} />   // lists each check in plain words + link to /privacy
<NumberStep next={string} nvResult={'ok'|'fail'|'wifi'|null} onVerified={() => void} />
<StepList steps={CheckStep[]} />                                   // ✅/❌ + message per step
```
Layout: mobile-first, max-width 480px, a persistent banner "Use mobile data, not Wi-Fi". `NumberStep` submits the phone to `/api/nv/start?phone=…&next=…` (full navigation); on return reads `?nv=`.

- [ ] **Step 1: Failing tests:** `ConsentScreen` renders one line per check and the accept button is the only way forward; `NumberStep` with `nvResult='wifi'` shows exactly `"Switch to mobile data and try again"` (Review Focus 5); with `'fail'` shows `"We couldn't confirm this phone number"`; with `'ok'` calls `onVerified`.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Commit `feat(web): phone page shell, consent and number step`.

---

### Task 10: Landlord `/verify` wizard and `/privacy` (Track P)

**Files:**
- Create: `apps/web/app/(phone)/verify/page.tsx`, `apps/web/app/(phone)/verify/VerifyWizard.tsx`, `apps/web/app/(phone)/privacy/page.tsx`
- Test: `apps/web/app/(phone)/verify/verify.test.tsx`

**Interfaces:** Consumes Task 9 components and the `/api/verify/*` contract (Task 1). Tests stub `fetch` with `vi.fn()`, so this task doesn't wait for Task 7.

Wizard steps: consent (`['number','kyc','simswap','location']`) → number → identity form (given name, family name, birthdate, ID document number, apartment address) → `StepList` of results → "I'm at the apartment" button → listing URLs textarea (one per line) → result: the code large, the paste line with a **Copy** button, accepted/rejected lists with reasons. Wizard state survives the NV redirect via `sessionStorage` (form fields except `idDocument`, which is re-asked if lost).

`/privacy`: what is stored (check results, timestamps, phone hashes, apartment address, listing URLs, viewing report categories), what is never stored (ID number, name, birthdate, phone location, raw phone numbers), legal basis consent, contact email placeholder, how to contest a report (contact email).

- [ ] **Step 1: Failing tests:** with mocked fetch returning the happy path, a user completing the wizard sees `VC-7K3Q` and the exact paste line; a mocked `simswap` failure shows `"This SIM was changed in the last 7 days"` and no listings step; rejected `already_registered` URL shows `"Already registered — contact us"`; `idDocument` is never written to `sessionStorage` (assert on storage contents).
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Manual: on a phone (mock mode, deployed URL) complete the wizard with `0700000001`. Expected: code shown.
- [ ] **Step 4:** Commit `feat(web): landlord verify wizard and privacy page`.

---

### Task 11: Student `/viewing/[verificationId]` page (Track P)

**Files:**
- Create: `apps/web/app/(phone)/viewing/[verificationId]/page.tsx`, `ViewingFlow.tsx`
- Test: `apps/web/app/(phone)/viewing/viewing.test.tsx`

Flow: consent (`['number','location']`) → number → "I'm at the viewing" + five category buttons with spec labels (`✅ All good`, `Landlord didn't show up`, `Apartment doesn't match photos/description`, `Asked for money before the viewing`, `Person at the viewing isn't the verified landlord`) → submit `POST /api/viewing/report` → thank-you with the returned counts via `reportLine`. Submit button disables on first tap.

- [ ] **Step 1: Failing tests:** 403 `not_at_address` shows `"You need to be at the apartment to report"`; 409 shows `"You've already reported this viewing"`; double-click submits once (assert fetch called once); 200 shows the `reportLine` text.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Commit `feat(web): student viewing report page`.

---

### Task 12: Chrome extension — extraction, badge, panel (Track E)

**Files:**
- Create: `apps/extension/entrypoints/listing.content.ts`, `apps/extension/entrypoints/background.ts`, `apps/extension/lib/adapters.ts`, `apps/extension/lib/extract.ts`, `apps/extension/lib/badge-ui.ts`
- Create: `apps/extension/test/fixtures/demo-listing.html`, `olx-listing.html`
- Test: `apps/extension/lib/extract.test.ts`, `apps/extension/lib/badge-ui.test.ts`

**Interfaces:**
- Consumes: `parseListingUrl`, `findCode`, `reportLine`, `CheckResponse` (Tasks 1–2).
- Produces:
```ts
interface SiteAdapter { site: Site; matches: string[]; descriptionSelector: string; phoneSelector?: string }
ADAPTERS: SiteAdapter[]                      // olx, storia (stretch), imobiliare (stretch), demo
extractFromDocument(doc: Document, url: string, adapter: SiteAdapter, demoOrigin: string):
  { listing: ListingRef | null; code: string | null; phone: string | null }
renderBadge(host: HTMLElement, res: CheckResponse, opts: { appUrl: string }): void   // into a Shadow DOM root
```
Content script matches the adapter's hosts plus `NEXT_PUBLIC_APP_URL`/demo origin (build-time `WXT_APP_URL`). It extracts, sends `{type:'check', params}` to the background, which `fetch`es `${WXT_APP_URL}/api/check` (host permission for the app origin) and replies. Badge: fixed top-right pill with emoji + label; click expands a panel with the report line, and — for green/amber — a QR code (`qrcode` package) to `${appUrl}/viewing/${verificationId}` titled "Report a viewing"; for `grey_unverified` an "Ask the landlord to verify" button that copies `Hi! Before I visit, could you verify your listing on ChirieSigură? It takes 2 minutes: ${appUrl}/verify`.

- [ ] **Step 1:** Fixtures: `demo-listing.html` = saved output of `/demo/listing/d1` once Task 13 lands (until then hand-write it with the same `data-testid` markup Task 13 specifies), plus a "similar listings" block containing `VC-ZZZZ` **outside** the description. `olx-listing.html` = owner saves a real OLX listing page and trims it; owner reads the description and phone selectors from it.
- [ ] **Step 2: Failing tests:** demo fixture → `{listing:{site:'demo',listingId:'d1'}, code:'VC-7K3Q', phone:'+40 700 000 001'}` and the `VC-ZZZZ` in similar listings is ignored (Review Focus 3); OLX fixture → OLX listing ref and `code:null`; page without a description element → `code:null`. `renderBadge` with each `BadgeStatus` shows the verbatim label; green shows a QR `<canvas>`/`<img>` and grey_unverified shows the ask button; red shows neither.
- [ ] **Step 3:** Run `pnpm --filter @cs/extension test` → FAIL. Implement. Run → PASS.
- [ ] **Step 4:** Manual: `pnpm dev:ext`, open `/demo/listing/d1` → 🟢, `/demo/listing/d2` → 🔴 Copied, `/demo/listing/d3` → ⚪ Not verified, a real OLX listing → ⚪ Not verified.
- [ ] **Step 5:** Commit `feat(extension): listing extraction and badge`.

---

### Task 13: Demo listing pages and seed (Track D)

**Files:**
- Create: `apps/web/app/demo/listing/[id]/page.tsx`, `apps/web/lib/demo-listings.ts`, `apps/web/scripts/seed.ts`
- Modify: `apps/web/lib/geocode.ts` — add the demo apartment to `DEMO_ADDRESSES`
- Test: `apps/web/scripts/seed.test.ts`

**Interfaces — Produces:** markup contract the extension's demo adapter uses: description in `[data-testid="description"]`, phone in `[data-testid="phone"]`, a `[data-testid="similar"]` block.

Demo data (`demo-listings.ts`): generic classifieds layout, **no OLX branding**, a Timișoara 2-room flat with photos from a free stock source.
| id | Description | Phone shown | Expected badge |
|---|---|---|---|
| `d1` | original text + `Proprietar verificat · ChirieSigură VC-7K3Q` | `+40 700 000 001` | 🟢 → 🟠 after the live report |
| `d2` | identical text and code (the scammer's copy) | `+40 799 999 999` | 🔴 Copied |
| `d3` | different flat, no code | `+40 733 333 333` | ⚪ Not verified |
| `d4` | the same landlord's second flat, no code yet | `+40 700 000 001` | the listing the landlord registers **live** in the demo |
Each page's similar-listings block contains `VC-ZZZZ`.

Seed (`pnpm --filter @cs/web seed`, idempotent **and a demo reset** — run before every rehearsal): deletes everything for `demo:d4` and all reports from `+40711111111`; then ensures landlord `+40700000001`; verification code `VC-7K3Q`, address = the demo apartment, location TRUE, verifiedAt now; listing `demo:d1`; two `no_show` reports from `+40711111118`, `+40711111119` (so the live report from `+40711111111` flips d1 to amber).

- [ ] **Step 1: Failing test:** after running `seed(db)` twice on a test DB, `/api/check` logic yields green for `demo:d1`, `red_copied` for `demo:d2` with code `VC-7K3Q`, and inserting one more `no_show` report from `+40711111111` yields amber; running `seed(db)` again returns `demo:d1` to green and leaves `demo:d4` unregistered.
- [ ] **Step 2:** Run → FAIL. Implement pages, data, seed. Run → PASS.
- [ ] **Step 3:** Commit `feat(web): demo listings and seed`.

---

### Task 14: Deploy, end-to-end demo run, pitch (Track D, with everyone at checkpoints)

**Files:**
- Create: `docs/pitch.md`, `docs/checkpoints.md`

- [ ] **Step 1:** Deploy `apps/web` to Vercel (root dir `apps/web`), env vars from `.env.example` set in Vercel, run migrations and seed against production DB. Build the extension with `WXT_APP_URL=<prod url>` and load it unpacked on the demo laptop.
- [ ] **Step 2: Sat 18:00 checkpoint — run the spec §8 demo end-to-end on prod, mock mode:** run seed (reset); phone completes `/verify` with `0700000001`, at the demo address, registering `/demo/listing/d4` → a new code is shown; laptop `d1` 🟢; `d2` 🔴 Copied; phone scans the QR, reports `Landlord didn't show up` as `0711111111`; laptop reload of `d1` → 🟠. Log result and blockers in `docs/checkpoints.md`.
- [ ] **Step 3:** If Nokia access exists, flip whichever `NETWORK_MODE_*` work against the Nokia simulator, rerun Step 2, log which APIs are live.
- [ ] **Step 4:** `docs/pitch.md`: 3-minute script following spec §8 timings, including the honest-limit line ("a scammer would have to use their real identity, and viewers catch them"), the GDPR line ("we store a match result, never your ID"), the four Nokia APIs named, and next steps (ANCPI owner check, more sites, partners). Slides: problem, demo (live), how it works (four signals), privacy, next.
- [ ] **Step 5: Sun 12:00 freeze, 13:30 two timed rehearsals** — each under 3:00, with a recorded backup video of the demo in case the venue Wi-Fi/mobile data fails.
- [ ] **Step 6:** Commit `docs: pitch and checkpoints`.
