# Landlord Ban and Phone Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A team-confirmed lifetime ban keyed on the KYC-confirmed identity (ID card number, and name + birthdate), shown as 🔴 *Landlord banned*. Also a "Report it" link on `/check`, so a student with only a phone can report a viewing.

**Architecture:**
- **Storage:** two HMAC fingerprints and two timestamps on `landlord`.
- **Identity step:** the identity route refuses a banned person after KYC passes.
- **Badge:** `decideBadge` gets a `red_banned` status.
- **Team review:** an Auth0-gated `/review` phone page and `POST /api/review` confirm or dismiss holds. "On hold" is computed from the existing amber thresholds.

**Tech Stack:** Next.js 16 App Router, Drizzle + Postgres (PGlite in tests), Auth0 (`@auth0/nextjs-auth0` v4), Vitest + Testing Library, WXT extension, pnpm workspace (`@cs/shared`, `@cs/web`, `@cs/extension`).

**Spec:** [docs/superpowers/specs/2026-11-14-landlord-ban-and-phone-review-design.md](../specs/2026-11-14-landlord-ban-and-phone-review-design.md)

## Global Constraints

- **Raw ID data:** never persisted or logged. Only `id_doc_hash` and `name_birth_hash` (HMAC-SHA256 with `PHONE_PEPPER`) are stored.
- **Badge label:** exactly `Landlord banned`. The status name is `red_banned`.
- **Refusal copy:** exactly `You can't verify with ChirieSigură. If you think this is a mistake, email privacy@chiriesigura.example.`
- **Review access:** an Auth0 session with `email_verified === true` and the email in `REVIEW_EMAILS` (comma-separated, compared case-insensitively). Otherwise the page returns 404 and the API returns 403.
- **Reviewer view:** the reviewer never sees names or ID data. Only report counts, dates and listing links.
- **Ban scope:** a ban sets `banned_at` on every landlord row sharing either hash.
- **Phone pages:** follow the `chiriesigura-phone-pages` skill (layout, components, copy rules).
- **Commits:** end each message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Same person, typed differently.** `tm 123456` vs `TM123456`, `Ionescu` vs `IONESCU`, `Ștefan` vs `Stefan`, extra spaces. All must produce the same hash. Pinned in Task 2.
2. **A banned person whose KYC fails.** They must get the ordinary KYC failure, not the ban message. The ban check runs only on operator-confirmed data, so typing someone else's details can't reveal a ban. Pinned in Task 3.
3. **A non-reviewer posting to `/api/review` directly.** Including a signed-in student and an allowlisted email with `email_verified: false`. Must get 403. Pinned in Task 5.
4. **Banning an already-banned landlord, or acting on an unknown `landlordId`.** Ban is idempotent; an unknown id gets 404. Pinned in Task 5.
5. **A banned landlord's code on a copied listing.** Shows `red_banned`, not `red_copied`. Pinned in Task 1.

---

### Task 1: `red_banned` badge status

**Files:**
- Modify: `packages/shared/src/types.ts` (BadgeStatus), `packages/shared/src/rules/badge.ts`, `packages/shared/src/rules/badge.test.ts`
- Modify: `apps/extension/lib/badge-ui.ts` (`TONE`, and `recordRows` if it switches on status), `apps/extension/entrypoints/background.ts` (`ACTION`)

**Interfaces:**
- Produces:
  - `BadgeStatus` includes `'red_banned'`.
  - `BadgeInput.verification` gains `banned: boolean`.
  - `export function isWarned(r: ReportCounts): boolean`, renamed from the private `warned` and exported for Task 5.

- [ ] **Step 1: Write failing tests in `badge.test.ts`**

```ts
it('a banned landlord shows red_banned on their own listing', () => {
  expect(decideBadge({ ...base, verification: { ...base.verification!, banned: true } })).toBe('red_banned');
});
it('a banned landlord shows red_banned even on a copied listing', () => {
  expect(decideBadge({ ...base, listing: { site: 'demo', listingId: 'd9' }, verification: { ...base.verification!, banned: true } })).toBe('red_banned');
});
it('labels red_banned', () => expect(badgeLabel('red_banned')).toBe('Landlord banned'));
```
(`base` is the file's existing green input; add `banned: false` to it.)

- [ ] **Step 2: Run** `pnpm --filter @cs/shared test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Add `'red_banned'` to `BadgeStatus` and `LABELS`.
  - In `decideBadge`, return `'red_banned'` right after the `!i.verification` check.
  - Export `isWarned`.
  - Add `red_banned: 'fail'` to `TONE` and `red_banned: { text: '✕', color: '#b3261e' }` to `ACTION`.
- [ ] **Step 4: Run**
  - `pnpm --filter @cs/shared test`
  - `pnpm --filter @cs/extension compile`
  - `pnpm --filter @cs/extension test`

  Expected: all PASS. The web app won't compile until Task 4 adds `banned` to `IssuedVerification`. That's expected; `@cs/web` tests still run.
- [ ] **Step 5: Commit** `feat(shared): red_banned badge status`

### Task 2: Identity fingerprints and DB columns

**Files:**
- Modify: `apps/web/lib/db/schema.ts`, `apps/web/lib/hash.ts`
- Create: migration via `pnpm --filter @cs/web db:generate` (lands in `apps/web/drizzle/`), `apps/web/lib/hash.test.ts`

**Interfaces:**
- Produces:
  - `landlord` columns, all nullable: `idDocHash` (`id_doc_hash` text), `nameBirthHash` (`name_birth_hash` text), `bannedAt` (`banned_at` timestamptz), `reviewDismissedAt` (`review_dismissed_at` timestamptz).
  - `export interface IdentityHashes { idDocHash: string; nameBirthHash: string }`
  - `export function identityHashes(i: { givenName: string; familyName: string; birthdate: string; idDocument: string }): IdentityHashes`

- [ ] **Step 1: Write failing tests in `hash.test.ts`** (set `process.env.PHONE_PEPPER` in `beforeAll`)

```ts
const a = { givenName: 'Ștefan ', familyName: 'Ionescu', birthdate: '1990-07-15', idDocument: 'tm 123456' };
it('normalises case, spaces and diacritics', () => {
  expect(identityHashes(a)).toEqual(identityHashes({ givenName: 'STEFAN', familyName: ' ionescu', birthdate: '1990-07-15', idDocument: 'TM123456' }));
});
it('a different card keeps the name hash', () => {
  const b = identityHashes({ ...a, idDocument: 'TM999999' });
  expect(b.nameBirthHash).toBe(identityHashes(a).nameBirthHash);
  expect(b.idDocHash).not.toBe(identityHashes(a).idDocHash);
});
it('the two kinds never collide', () => {
  const h = identityHashes({ givenName: 'x', familyName: 'y', birthdate: 'z', idDocument: 'X|Y|Z' });
  expect(h.idDocHash).not.toBe(h.nameBirthHash);
});
```

- [ ] **Step 2: Run** `pnpm --filter @cs/web test lib/hash.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `identityHashes`: HMAC with `PHONE_PEPPER` over `id:<ID>` and `name:<given>|<family>|<birthdate>`.
  - ID: uppercase, keep `[A-Z0-9]` only.
  - Names: NFD, strip combining marks, lowercase, collapse whitespace, trim. ș/ț in either cedilla or comma form must normalise to s/t.
  - Add the four columns, then run `pnpm --filter @cs/web db:generate`.
- [ ] **Step 4: Run** `pnpm --filter @cs/web test`. Expected: PASS. `makeTestDb` applies the new migration.
- [ ] **Step 5: Commit** `feat(web): identity fingerprints and ban columns on landlord`

### Task 3: Refuse a banned person at the identity step

**Files:**
- Create: `apps/web/lib/contact.ts` with `export const CONTACT = 'privacy@chiriesigura.example'`. Make `app/(phone)/privacy/page.tsx` import it instead of declaring it.
- Modify: `apps/web/app/api/verify/identity/route.ts`, `apps/web/lib/queries.ts`, `apps/web/app/api/verify/verify.test.ts`

**Interfaces:**
- Consumes: `identityHashes`, `IdentityHashes` (Task 2).
- Produces: `export async function isBannedIdentity(db: Db, h: IdentityHashes): Promise<boolean>` in `lib/queries.ts`. True when any landlord with `bannedAt` not null has a matching `idDocHash` **or** `nameBirthHash`.

- [ ] **Step 1: Write failing tests in `verify.test.ts`**
  - **`stores both hashes on the landlord`:** after a successful identity call, the landlord row's `idDocHash` and `nameBirthHash` equal `identityHashes(ID)`.
  - **`refuses a banned person on a new number, matched by card`:**
    - Insert a landlord with `bannedAt: new Date()`, `idDocHash: identityHashes(ID).idDocHash`, `nameBirthHash: 'other'`.
    - Call identity as `+40700000010`.
    - Expect `ok: false`, the `kyc` step `{ ok: false, message: <refusal copy> }`, and `landlord` row count still 1 with no `verification` rows.
  - **`refuses a banned person matched by name and birthdate only`:** the same, with only `nameBirthHash` matching.
  - **`a banned person whose KYC fails gets the KYC message`:**
    - Use `+40700000003`, whose mock fails `idDocument`.
    - With a banned row matching `ID`, the `kyc` message is `Your ID details don't match this phone number's owner`.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test app/api/verify`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - After `steps` all pass, compute `identityHashes(b)`.
  - If `isBannedIdentity`, replace the `kyc` step with `{ name: 'kyc', ok: false, message: \`You can't verify with ChirieSigură. If you think this is a mistake, email ${CONTACT}.\` }` and return `{ ok: false, steps }` before geocoding.
  - Otherwise include both hashes in the landlord insert `values` and in `onConflictDoUpdate.set`.
- [ ] **Step 4: Run** `pnpm --filter @cs/web test app/api/verify`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): a banned person can't verify again with a new number`

### Task 4: `/api/check` reports bans

**Files:**
- Modify: `apps/web/lib/queries.ts` (`IssuedVerification`, `findVerificationByCode`), `apps/web/app/api/check/check.test.ts`

**Interfaces:**
- Consumes: `banned` on `BadgeInput.verification` (Task 1), `landlord.bannedAt` (Task 2).
- Produces: `IssuedVerification.banned: boolean`.

- [ ] **Step 1: Write failing test in `check.test.ts`: `shows a banned landlord as red_banned, with no verificationId`**
  - Set `bannedAt` on `seeded.landlordId`.
  - `check({ ...d1, code: 'VC-7K3Q' })` returns body `{ status: 'red_banned', label: 'Landlord banned' }`.
  - `body.verificationId` is `undefined`.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test app/api/check`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Select `landlord.bannedAt` in `findVerificationByCode` and return `banned: bannedAt !== null`.
  - The route needs no change: it only attaches `verificationId` for green and amber.
- [ ] **Step 4: Run**
  - `pnpm --filter @cs/web test`
  - `pnpm --filter @cs/web exec tsc --noEmit`

  Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat(web): check answers red_banned for a banned landlord`

### Task 5: Review API (hold list, ban, dismiss)

**Files:**
- Create: `apps/web/lib/review.ts`, `apps/web/app/api/review/route.ts`, `apps/web/app/api/review/review.test.ts`
- Modify: `apps/web/lib/queries.ts`, `.env.example` (add `REVIEW_EMAILS=`)

**Interfaces:**
- Consumes: `isWarned` (Task 1), `landlordReportCounts` (existing), `landlord` columns (Task 2).
- Produces:
  - `export async function isReviewer(): Promise<boolean>` in `lib/review.ts`. It reads `auth0.getSession()` → `session.user.email`, `session.user.email_verified`, and `process.env.REVIEW_EMAILS`.
  - `export interface HoldItem { landlordId: string; reports: ReportCounts; lastReportAt: string; listings: { site: string; listingId: string; url: string }[] }`
  - In `lib/queries.ts`:
    - `export async function holdList(db: Db): Promise<HoldItem[]>`: landlords with `bannedAt` null, `isWarned(counts)`, and (`reviewDismissedAt` null or a report newer than it). Newest report first.
    - `export async function banPerson(db: Db, landlordId: string): Promise<boolean>`: false when the id is unknown. Sets `bannedAt = now` on that row and every row sharing a non-null `idDocHash` or `nameBirthHash`, without overwriting an existing `bannedAt`.
    - `export async function dismissHold(db: Db, landlordId: string): Promise<boolean>`
  - `POST /api/review` with body `{ landlordId: string; action: 'ban' | 'dismiss' }`:
    - 403 `{ error: 'forbidden' }` when not a reviewer;
    - 400 on a bad body;
    - 404 on an unknown landlord;
    - 200 `{ ok: true }` otherwise.

- [ ] **Step 1: Write failing tests in `review.test.ts`**
  - **Setup:** mock `@/lib/auth0` as `{ auth0: { getSession: vi.fn() }, isSignedIn: vi.fn() }`. Set `REVIEW_EMAILS='team@x.ro, Lead@x.ro'`. Use `seedVerified` and `addReports(db, verificationId, 'money_upfront', 2)` for a landlord on hold.
  - `holdList` returns the seeded landlord with `reports.money_upfront === 2`, and is empty with only 1 such report.
  - **API returns 403 for:**
    - no session;
    - `student@x.ro`;
    - `team@x.ro` with `email_verified: false`.
  - **`lead@x.ro` with `email_verified: true`:** the reviewer check is case-insensitive.
    - ban → 200;
    - `holdList` is then empty;
    - `/api/check` on d1 gives `red_banned`.
  - **Ban spreads:** give the seeded landlord and a second landlord row the same `nameBirthHash`. Banning the first sets `bannedAt` on both.
  - **Repeat ban:** keeps the first `bannedAt` value.
  - **Unknown `landlordId`:** a random UUID → 404. A non-UUID string → 400.
  - **Dismiss:** the landlord leaves `holdList`, then returns after one more `money_upfront` report.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test app/api/review`. Expected: FAIL.
- [ ] **Step 3: Implement** the functions and route above. Validate `landlordId` as a UUID before querying.
- [ ] **Step 4: Run** `pnpm --filter @cs/web test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): review API to confirm or dismiss a landlord ban`

### Task 6: `/review` page

**Files:**
- Create: `apps/web/app/(phone)/review/page.tsx` (server), `apps/web/app/(phone)/review/ReviewList.tsx` (client), `apps/web/app/(phone)/review/review.test.tsx`

**Interfaces:**
- Consumes: `isReviewer`, `holdList`, `HoldItem`, `POST /api/review` (Task 5).
- Produces: `ReviewList({ items }: { items: HoldItem[] })`.

- [ ] **Step 1: Write failing tests in `review.test.tsx`** (jsdom, like `check.test.tsx`)
  - **One card per item.** Each card shows the existing `reportLine(item.reports)` text, `Last report <DD Mon>`, and each listing as a link to its `url`.
  - **Confirm ban:**
    - Clicking **Confirm ban** shows the confirm copy `Ban this person for life? Every listing and any new verification with the same ID is blocked.`.
    - Confirming POSTs `{ landlordId, action: 'ban' }`, after which the card reads `Banned`.
  - **Dismiss:** POSTs `{ landlordId, action: 'dismiss' }`, after which the card reads `Dismissed`.
  - **Failed POST:** shows an error on that card and keeps its buttons.
  - **No items:** `No landlords on hold.`
- [ ] **Step 2: Run** `pnpm --filter @cs/web test "app/(phone)/review"`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `page.tsx` calls `notFound()` unless `await isReviewer()`, then renders `ReviewList` with `await holdList(getDb())`.
  - Render per request, as `/check` does.
  - Set metadata title `Review holds`.
  - Use the phone-pages skill's layout and components. Confirming uses an in-card confirm step, not `window.confirm`.
- [ ] **Step 4: Run**
  - `pnpm --filter @cs/web test`
  - `pnpm --filter @cs/web lint`

  Expected: PASS and clean.
- [ ] **Step 5: Commit** `feat(web): team-only /review page`

### Task 7: "Report it" link on `/check`

**Files:**
- Modify: `apps/web/app/(phone)/check/CheckForm.tsx`, `apps/web/app/(phone)/check/check.test.tsx`

- [ ] **Step 1: Write failing tests**
  - A green or amber result with `verificationId: 'v1'` shows a link named `I'm at the viewing · Report it`, with `href` `/viewing/v1`.
  - `red_copied` and `red_banned` results show no such link.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test "app/(phone)/check"`. Expected: FAIL.
- [ ] **Step 3: Implement.** Inside the result block, render `<a className={s.primary} href={`/viewing/${encodeURIComponent(id)}`}>` when `result.data.verificationId` is present. The API only sends it for green and amber.
- [ ] **Step 4: Run** `pnpm --filter @cs/web test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): report a viewing from /check on a phone`

### Task 8: Demo data, pitch and privacy

**Files:**
- Modify:
  - `apps/web/lib/demo-listings.ts` (add `d5`);
  - `apps/web/scripts/seed.ts`;
  - `apps/web/lib/network/mock-fixtures.ts` (comment only: `+40700000009` and `+40700000010` are the demo scammer and pass everything);
  - `apps/web/app/(phone)/privacy/page.tsx`;
  - `docs/pitch.md`.

**Interfaces:**
- Consumes: `identityHashes` (Task 2).

- [ ] **Step 1: Add demo listing `d5`.**
  - Title `Apartament 2 camere, mobilat, zona Complex Studențesc`, price `250 €/lună`, area `Timișoara, Complex Studențesc`, contact `Mihai`, phone `+40 700 000 009`.
  - Three description lines: the owner is abroad, a deposit holds the flat, contact only on WhatsApp. The last description line is `Proprietar verificat · ChirieSigură VC-BAN5`.
  - Reuse `d1`'s photo helper with any two existing photo ids.
- [ ] **Step 2: Add the scammer to the seed.**
  - Upsert a landlord for `+40700000009` with all `*_at` set and `identityHashes({ givenName: 'Mihai', familyName: 'Ionescu', birthdate: '1990-07-15', idDocument: 'TM654321' })`.
  - Set `bannedAt: null` and `reviewDismissedAt: null` on every seed run.
  - Upsert a verification with code `VC-BAN5` at `DEMO_APARTMENT`, listing `demo/d5`, and 3 `money_upfront` reports from fixed reporter hashes, upserted the same way the seed does the existing earlier reports.
- [ ] **Step 3: Check the seed.**
  - Run `pnpm --filter @cs/web seed` twice, then `pnpm --filter @cs/web dev`.
  - Signed in as an allowlisted email, `/review` shows one card ("3 asked for money first").
  - Confirm the ban: the extension or `/check` on `d5` with code `VC-BAN5` shows 🔴 *Landlord banned*.
  - `/verify` with `0700000010` and the Mihai Ionescu details stops at the identity step with the refusal copy.
  - Re-run the seed: the card is back on hold.
- [ ] **Step 4: Update `/privacy`.** Add one paragraph: after the operator confirms a landlord's ID, we keep two one-way fingerprints (ID card number; name + birthdate). We use them only to stop a person our team has banned for life from verifying again, and the contact can be reached about a ban.
- [ ] **Step 5: Update `docs/pitch.md`.**
  - Add the demo inputs row (scammer Mihai Ionescu, `0700000009` and `0700000010`, ID `TM654321`) and `REVIEW_EMAILS` to "Before you go on stage".
  - Add the three live ban beats after step 4. Note in the ban beat that `/review` also shows Andrei, because the live no-show report is his 3rd. Ban the card reading "3 asked for money first", and say on stage that one bad week doesn't ban anyone, a human decides.
  - Change step 4 to: the student phone opens `/check` (signed in), enters the d1 link and code, and taps "I'm at the viewing · Report it".
  - Change the privacy line to: *"we keep a fingerprint that can only answer: is this a banned person?"*
  - Leave a `<!-- pitch owner: trim ~40 s to stay within 3:00 -->` note at the top of the Script.
- [ ] **Step 6: Run** `pnpm -r test`. Expected: PASS.
- [ ] **Step 7: Commit** `feat: banned-scammer demo data, pitch and privacy`

## After all tasks

- [ ] Add `REVIEW_EMAILS` (team emails) to Vercel Production, then `pnpm --filter @cs/web seed:prod` after deploy.
