# Trusted Reviews, Stage 1 (Contain the Abuse) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Problem reports stop changing the badge on their own. Each one becomes a case the team decides on `/review` (dismiss, mark false, confirm warning, ban), with warning signs. Reporters must be signed in, and false reporters are barred.

**Architecture:**
- **Data:** a new `report_case` row for every problem `viewing_report`, plus a `reporter_bar` table.
- **Badge (`lib/cases.ts`):** the badge reads a landlord's *standing* from cases. 🟠 = an upheld case; soft note = an open case; the public counts are "all good" reports plus upheld problems. All of it is gathered across the person's rows that share an `id_doc_hash`.
- **Team queue:** `/review` and `POST /api/review` move from landlord holds to cases.
- **No new services:** the at-address rule stays the proof in this stage.

**Tech Stack:** Next.js 16 (App Router, `apps/web`), Drizzle + Postgres (PGlite in tests), Auth0 (`@auth0/nextjs-auth0` v4), Vitest, WXT extension (`apps/extension`), shared rules (`packages/shared`).

**Spec:** `docs/superpowers/specs/2026-11-15-trusted-reviews-design.md` (§4.11 stage 1; the stage-1 parts of §4.1, §4.5–§4.8, §4.12, §4.13).

## Global Constraints

- Read the relevant guide in `apps/web/node_modules/next/dist/docs/` before writing Next.js code (`apps/web/AGENTS.md`).
- Phone pages follow the `chiriesigura-phone-pages` skill; extension badge changes follow the `chiriesigura-extension-badge-states` skill.
- Soft-note copy, verbatim, everywhere it shows: `Viewers reported a problem · under review · never pay before you've seen the flat.`
- **Hashing:** raw phone numbers and Auth0 `sub` values are never stored. Use keyed HMAC with `PHONE_PEPPER` (`lib/hash.ts`). The account hash uses the prefix `account:`.
- **Case statuses:** `'awaiting_landlord' | 'ready' | 'dismissed' | 'false_report' | 'upheld'`. Stage 1 creates cases as `ready`.
- **Who may decide what:**
  - Confirm warning (`uphold`) and `ban` need status `ready`.
  - `dismiss` and `false_report` work on `awaiting_landlord` or `ready`.
  - A decided case can't be decided again.
- **Warning-sign thresholds:**
  - burst: another case on the same person within **2 h**;
  - reporter history: cases against **3+** distinct landlords in **90 days**, or an earlier `dismissed` case;
  - SIM: `network().simSwapped(e164, 720)`.
- **Retention in this stage:** a false-report bar lasts **2 years** (`expires_at`). An upheld case counts for **2 years** from `decided_at`. The deletion job is stage 3.
- **Commits:** no `Co-Authored-By` or `Signed-off-by` lines (user's global CLAUDE.md). Stage only the files each task names. Other sessions' uncommitted files are in this tree.
- **Line endings:** don't flip CRLF/LF on files you touch (`crlf-worktree-line-endings` skill).
- **Tests:**
  - `pnpm --filter @cs/web test`, `pnpm --filter @cs/shared test` and `pnpm --filter @cs/extension test`;
  - typecheck with `pnpm --filter @cs/web exec tsc --noEmit`;
  - if web tests hit 5000 ms timeouts, see the `chiriesigura-web-test-workers` skill.

## Review Focus

1. **A double tap or two reviewers** deciding the same case: exactly one decision lands, and the other gets 409. Test in Task 4.
2. **The operator's SIM-swap call fails** while a report is filed: the report is still accepted, with `sim_swapped` null. The renter isn't blocked. Test in Task 3.
3. **A landlord with no `id_doc_hash`** (legacy rows): their standing covers only their own row. It must never merge every null-hash landlord. Test in Task 2.
4. **An expired bar** (`expires_at` in the past) no longer blocks reporting. Test in Task 3.
5. **An upheld case decided more than 2 years ago** no longer turns the badge 🟠 or counts publicly. Test in Task 2.

---

### Task 1: Data model, migration and identity helpers

**Files:**
- Modify: `apps/web/lib/db/schema.ts`
- Create: `apps/web/drizzle/0004_*.sql` and `apps/web/drizzle/meta/*` (generated)
- Modify: `apps/web/lib/hash.ts`, `apps/web/lib/auth0.ts`, `apps/web/lib/review.ts`
- Test: `apps/web/lib/hash.test.ts`, `apps/web/lib/db/schema.test.ts`

**Interfaces:**
- Produces:
  - `viewingReport.reporterAccountHash: text | null` (column `reporter_account_hash`)
  - `viewingReport.simSwapped: boolean | null` (column `sim_swapped`)
  - `reportCase` table `report_case`: `id uuid pk`, `reportId uuid not null unique → viewing_report.id on delete cascade`, `landlordId uuid not null → landlord.id`, `status text not null`, `decidedAt timestamptz null`, `decidedBy text null` (reviewer email), `createdAt`
  - `reporterBar` table `reporter_bar`: `id uuid pk`, `kind text not null` (`'phone' | 'account'`), `hash text not null`, `caseId uuid null → report_case.id on delete set null`, `expiresAt timestamptz not null`, `createdAt`, `unique('bar_once').on(kind, hash)`
  - `accountHash(sub: string): string` in `lib/hash.ts`
  - `signedInSub(): Promise<string | null>` in `lib/auth0.ts`
  - `reviewerEmail(): Promise<string | null>` in `lib/review.ts`; `isReviewer()` becomes `!!(await reviewerEmail())`
- `landlord.reviewDismissedAt` stays for now. Task 7 drops it.

- [ ] **Step 1: Write the failing tests**

In `hash.test.ts`:
```ts
it('accountHash is keyed, stable, and never equals the phone hash of the same string', () => {
  expect(accountHash('google-oauth2|123')).toBe(accountHash('google-oauth2|123'));
  expect(accountHash('google-oauth2|123')).not.toContain('123');
  expect(accountHash('x')).not.toBe(phoneHash('x'));
});
```

In `schema.test.ts`, following the file's existing pattern:
- `'a report has at most one case'`: a second `reportCase` insert with the same `reportId` throws.
- `'deleting a report deletes its case'`
- `'one bar per kind and hash'`: a second insert of `{ kind: 'phone', hash: 'h' }` throws.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @cs/web test -- lib/hash.test.ts lib/db/schema.test.ts`
Expected: FAIL (`accountHash` not exported; `reportCase` undefined).

- [ ] **Step 3: Implement the schema, `accountHash`, `signedInSub` and `reviewerEmail`**

- `accountHash`: `createHmac('sha256', pepper).update('account:' + sub)`.
- `signedInSub`: `(await auth0.getSession())?.user?.sub ?? null`.
- `reviewerEmail`: today's `isReviewer` logic, returning the lowercased email or null.

- [ ] **Step 4: Generate the migration**

Run: `pnpm --filter @cs/web db:generate`
Expected: a new `drizzle/0004_*.sql` that creates `report_case` and `reporter_bar` and adds the two `viewing_report` columns, and nothing else.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm --filter @cs/web test -- lib/hash.test.ts lib/db/schema.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/db/schema.ts apps/web/drizzle apps/web/lib/hash.ts apps/web/lib/hash.test.ts apps/web/lib/auth0.ts apps/web/lib/review.ts apps/web/lib/db/schema.test.ts
git commit -m "feat(web): report cases and reporter bars in the schema"
```

---

### Task 2: The badge reads standing from cases (🟠 only after a decision, soft note while open)

**Files:**
- Create: `apps/web/lib/cases.ts`, `apps/web/lib/cases.test.ts`
- Modify: `packages/shared/src/rules/badge.ts`, `packages/shared/src/rules/badge.test.ts`, `packages/shared/src/api.ts`
- Modify: `apps/web/app/api/check/route.ts`, `apps/web/app/api/check/check.test.ts`
- Modify: `apps/web/lib/test-seed.ts`
- Modify: `apps/web/scripts/seed.ts` (`resetReports` only), `apps/web/scripts/seed.test.ts` (the d1 live-report test only)

**Interfaces:**
- Consumes: `reportCase` and the `viewingReport` columns (Task 1).
- Produces, in `packages/shared`:
  - `BadgeInput` replaces `reports: ReportCounts` with `warned: boolean`. `decideBadge` returns `'amber'` where it used to return `isWarned(reports) ? 'amber' : 'green'`, now when `i.warned` is true.
  - `export const UNDER_REVIEW_TEXT = "Viewers reported a problem · under review · never pay before you've seen the flat."`
  - `export const REPORT_CATEGORY_TEXT` (today's private `CATEGORY_TEXT`, exported unchanged).
  - `CheckResponse.underReview?: true`
  - Keep `isWarned` and `AMBER_THRESHOLDS` exported. Only `holdList` uses them now, and Task 4 deletes all three.
- Produces, in `apps/web/lib/cases.ts`:
  - `export type CaseStatus = 'awaiting_landlord' | 'ready' | 'dismissed' | 'false_report' | 'upheld'`
  - `export const OPEN: CaseStatus[] = ['awaiting_landlord', 'ready']`
  - `export async function personLandlordIds(db: Db, landlordId: string): Promise<string[]>`: this row, plus every row with the same **non-null** `idDocHash`.
  - `export interface Standing { counts: ReportCounts; warned: boolean; underReview: boolean }`
  - `export async function landlordStanding(db: Db, landlordId: string, now = new Date()): Promise<Standing>`. Across the person's verifications:
    - `counts.ok` = distinct reporter phone hashes of `ok` reports;
    - `counts[problem]` = distinct reporters whose case is `upheld` with `decidedAt > now − 2 years`;
    - `warned` = any such upheld case;
    - `underReview` = any case in `OPEN`.
- Produces, in `apps/web/lib/test-seed.ts`: `addCases(db, verificationId, category, n, status: CaseStatus = 'ready', decidedAt?: Date)`. It inserts n reports (reporter phone hash `c-${category}-${i}`, account hash `a-${category}-${i}`) and a case for each, with `landlordId` taken from the verification. It returns the case ids.

- [ ] **Step 1: Write the failing tests**

`badge.test.ts`: replace the threshold test with these.
```ts
it('5: an upheld warning turns green into amber; open reports never do', () => {
  expect(decideBadge(input({ warned: true }))).toBe('amber');
  expect(decideBadge(input({ warned: false }))).toBe('green');
});
it('the soft note copy is verbatim', () => {
  expect(UNDER_REVIEW_TEXT).toBe("Viewers reported a problem · under review · never pay before you've seen the flat.");
});
```
In the `input()` helper and the far-away test, use `warned` instead of `reports`.

`cases.test.ts`:
- `'an open case puts the landlord under review without warning'`: `addCases(..., 'money_upfront', 3)` gives `{ warned: false, underReview: true, counts.money_upfront: 0 }`.
- `'an upheld case warns and counts publicly'`: `addCases(..., 'no_show', 1, 'upheld', new Date())` gives `{ warned: true, underReview: false, counts.no_show: 1 }`.
- `'dismissed and false reports count for nothing'`: gives `{ warned: false, underReview: false }` and all-zero problem counts.
- `'ok reports count at once'`: `addReports(..., 'ok', 2)` gives `counts.ok === 2`.
- `'an upheld case older than 2 years no longer counts'` (Review Focus 5): `decidedAt` = now − 731 days gives `warned: false`.
- `'standing follows the ID card hash'`: a second landlord row with the same `idDocHash` and its own verification holds an upheld case, so the first row's standing is `warned: true`.
- `'a legacy landlord with no ID hash stands alone'` (Review Focus 3): two rows with `idDocHash` null, one with an upheld case. The other row's standing is `warned: false`, and `personLandlordIds` returns only its own id.

`check.test.ts`:
- Replace `'turns amber from reports on another verification of the same landlord'` with the same setup, using `addCases(db, v2!.id, 'no_show', 1, 'upheld', new Date())`. Expect `status: 'amber'` and `reports.no_show === 1`.
- Add `'an open case keeps green with underReview and hides the problem count'`. Expect `status: 'green'`, `underReview: true`, and `reports` undefined (no published counts).

`seed.test.ts`, test `'sets up the demo…'`:
- The live no-show insert now also inserts a `ready` case.
- Expect `(await check('d1'))` toMatchObject `{ status: 'green', underReview: true }` instead of `'amber'`.
- After reseeding, expect `underReview` to be undefined.

`seed.test.ts`, test `'seeds the scammer on hold…'`: d5's three `ready` cases no longer make it amber. Change both `expect(await d5()).toBe('amber')` lines to `'green'`. The `holdList` assertions stay until Task 4: it still counts raw reports.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @cs/shared test && pnpm --filter @cs/web test -- lib/cases.test.ts app/api/check scripts/seed.test.ts`
Expected: FAIL (`UNDER_REVIEW_TEXT`, `landlordStanding` and `addCases` missing).

- [ ] **Step 3: Implement the shared changes, `lib/cases.ts` and `addCases`**

- [ ] **Step 4: Wire the check route**

In `app/api/check/route.ts`:
- replace `landlordReportCounts` with `landlordStanding`;
- pass `warned: standing.warned` to `decideBadge`;
- for green or amber, set `body.underReview = true` when `standing.underReview`;
- keep `body.reports` when any count in `standing.counts` is above 0.

- [ ] **Step 5: Seed problem reports as cases**

In `scripts/seed.ts`, `resetReports` also upserts a `ready` case for each problem-category report. It sets status `ready` and clears `decidedAt` and `decidedBy` on reseed (`onConflictDoUpdate` on `reportCase.reportId`).

- [ ] **Step 6: Run the tests and typecheck**

Run: `pnpm --filter @cs/shared test && pnpm --filter @cs/web test && pnpm --filter @cs/web exec tsc --noEmit`
Expected: all PASS. (`review.test.ts` `holdList` tests still pass: `holdList` is untouched until Task 4.)

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src apps/web/lib/cases.ts apps/web/lib/cases.test.ts apps/web/lib/test-seed.ts apps/web/app/api/check apps/web/scripts/seed.ts apps/web/scripts/seed.test.ts
git commit -m "feat: badge warns only on upheld cases and notes open ones"
```

---

### Task 3: Filing a report: sign-in, bars, own listing, SIM sign, case creation

**Files:**
- Modify: `apps/web/app/api/viewing/report/route.ts`, `apps/web/app/api/viewing/report.test.ts`
- Modify: `apps/web/lib/cases.ts` (add `isBarred`)
- Modify: `packages/shared/src/api.ts`

**Interfaces:**
- Consumes:
  - `signedInSub` and `accountHash` (Task 1);
  - `landlordStanding` and `personLandlordIds` (Task 2);
  - `network().simSwapped(e164, maxAgeHours)` (`lib/network/types.ts`).
- Produces:
  - `export async function isBarred(db: Db, h: { phoneHash: string; accountHash: string | null }, now = new Date()): Promise<boolean>`: true when a `reporterBar` row matches either hash and has `expiresAt > now`.
  - `ReportResponse.reason` adds `'signed_out' | 'barred' | 'own_listing'`.

**Route order:**
1. 400 for a bad body (as today).
2. 401 `signed_out` when `signedInSub()` is null.
3. 401 `not_number_verified`.
4. 404 for an unknown verification.
5. 403 `barred`.
6. 403 `own_listing`, when the reporter's phone hash equals the `phoneHash` of any row in `personLandlordIds(v.landlordId)`.
7. Location check: 503 or 403 `not_at_address` (as today).
8. `simSwapped`: catch any error to `null`.
9. In **one transaction**, insert the report (`reporterAccountHash`, `simSwapped`) and, when `category !== 'ok'`, a case `{ status: 'ready', landlordId: v.landlordId }`. Unique violation → 409 `already_reported`.
10. 200 `{ ok: true, counts: (await landlordStanding(db, v.landlordId)).counts }`.

- [ ] **Step 1: Write the failing tests**

In `report.test.ts`:
- Add `vi.mock('@/lib/auth0', () => ({ signedInSub: vi.fn(async () => 'google-oauth2|student') }))`.
- Update `'stores a location-verified report…'`. The response's `counts.no_show` is now **0**, because the problem waits for review. The report row has `reporterAccountHash === accountHash('google-oauth2|student')`, and exactly one `reportCase` row with `status: 'ready'`.
- `'an ok report opens no case and counts at once'`
- `'refuses a signed-out reporter'`: `signedInSub` resolves null, so 401 with `reason: 'signed_out'` and no rows.
- `'refuses a barred phone and a barred account'`: insert bars, so 403 `barred` for each.
- `'an expired bar no longer blocks'` (Review Focus 4): `expiresAt` = yesterday, so 200.
- `'the landlord cannot report their own listing'`: phone `+40700000001` (the `seedVerified` landlord) gets 403 `own_listing`.
- `'records the SIM-swap answer'`: spy `simSwapped` → `true`, so the row has `simSwapped: true`.
- `'a failed SIM-swap call still files the report'` (Review Focus 2): `simSwapped` rejects, so 200 and `simSwapped: null`.
- `'a double tap on a problem report makes exactly one case'`
- Update `'counts one student once per landlord…'` to use `ok` reports, since problem counts are hidden until review.
- `'never stores the reporter phone or account id in the clear'`

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @cs/web test -- app/api/viewing`
Expected: FAIL

- [ ] **Step 3: Implement `isBarred`, the new reasons and the route order above**

- [ ] **Step 4: Run the tests and typecheck**

Run: `pnpm --filter @cs/web test && pnpm --filter @cs/web exec tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/viewing apps/web/lib/cases.ts packages/shared/src/api.ts
git commit -m "feat(web): reports need sign-in, honour bars and open a case per problem"
```

---

### Task 4: Team decisions per case, warning signs, and the `/review` queue

**Files:**
- Modify: `apps/web/lib/cases.ts` (add `caseList` and `decideCase`)
- Modify: `apps/web/app/api/review/route.ts`, `apps/web/app/api/review/review.test.ts`
- Modify: `apps/web/app/(phone)/review/page.tsx`, `apps/web/app/(phone)/review/ReviewList.tsx`, `apps/web/app/(phone)/review/review.test.tsx`
- Modify: `apps/web/lib/queries.ts`: delete `holdList`, `HoldItem`, `dismissHold`, `landlordReportCounts`
- Modify: `packages/shared/src/rules/badge.ts` and `badge.test.ts`: delete `isWarned` and `AMBER_THRESHOLDS`
- Modify: `packages/shared/src/api.ts`
- Modify: `apps/web/scripts/seed.test.ts`: replace `holdList` with `caseList`

**Interfaces:**
- Consumes: `banPerson` (`lib/queries.ts`), `reviewerEmail` (Task 1), `personLandlordIds` (Task 2).
- Produces, in `packages/shared/src/api.ts`:
  - `export type ReviewAction = 'dismiss' | 'false_report' | 'uphold' | 'ban'`
  - `export interface ReviewRequest { caseId: string; action: ReviewAction }`
- Produces, in `apps/web/lib/cases.ts`:
  - `export type WarningSign = 'burst' | 'sim_changed' | 'reporter_many_landlords' | 'reporter_dismissed_before' | 'reporter_barred'`
  - `export interface CaseItem { caseId: string; landlordId: string; status: 'awaiting_landlord' | 'ready'; category: ReportCategory; createdAt: string; locationResult: string; listings: { site: string; listingId: string; url: string }[]; signs: WarningSign[] }`
  - `export async function caseList(db: Db, now = new Date()): Promise<CaseItem[]>`: open cases, `ready` before `awaiting_landlord`, newest first within each. A per-case query loop is fine at these volumes; mark it `// shortcut:` like `holdList` did. The signs:
    - `burst`: another case, any status, on `personLandlordIds(landlordId)`, with `|createdAt diff| ≤ 2 h`;
    - `sim_changed`: `report.simSwapped === true`;
    - `reporter_many_landlords`: cases created in the last 90 days whose report shares the reporter's phone hash or non-null account hash span **≥ 3** distinct `landlordId`;
    - `reporter_dismissed_before`: another case by the same reporter with status `dismissed`;
    - `reporter_barred`: `isBarred` holds for the reporter.
  - `export type DecideResult = 'ok' | 'not_found' | 'not_ready' | 'already_decided'`
  - `export async function decideCase(db: Db, caseId: string, action: ReviewAction, reviewer: string, now = new Date()): Promise<DecideResult>`:
    - A **conditional update** (`where id = caseId and status in allowed`) sets status, `decidedAt` and `decidedBy`. With zero rows updated, re-read the case and return `not_found`, `already_decided` or `not_ready`.
    - `uphold` → `upheld`.
    - `ban` → `upheld`, then `banPerson(db, landlordId)`.
    - `false_report` → `false_report`, then upsert a bar for the report's phone hash and, when non-null, its account hash: `{ caseId, expiresAt: now + 2 years }`, `onConflictDoUpdate` on (kind, hash).
- `POST /api/review`:
  - 403 when `reviewerEmail()` is null.
  - 400 unless `caseId` is a UUID and `action` is a `ReviewAction`.
  - Then map `DecideResult`: `ok` → 200 `{ ok: true }`; `not_found` → 404; `not_ready` and `already_decided` → 409 `{ error }`.

- [ ] **Step 1: Write the failing tests**

`review.test.ts`: rewrite around cases. In `beforeEach`, seed with `addCases(db, seeded.verificationId, 'money_upfront', 1)` and read its `caseId`.
- Keep the three `'refuses %s'` cases (403, nothing changes).
- `'uphold turns the badge amber'`: check gives `'amber'`.
- `'ban bans the person and the badge goes red'` (keep the case-insensitive email): `red_banned`.
- `'a ban spreads through the ID card hash only'` (today's test, driven by a case).
- `'dismiss clears the soft note and touches nothing else'`: `underReview` undefined, status `'green'`, no bars.
- `'false report bars the reporter phone and account for 2 years'`: two `reporterBar` rows; `expiresAt` within ±1 min of now + 730 days.
- `'uphold and ban are refused while awaiting the landlord; dismiss works'`: case status set to `awaiting_landlord` gives 409 `not_ready` for both, and 200 for dismiss.
- `'a double decision lands once'` (Review Focus 1): `Promise.all` of `uphold` and `dismiss` gives statuses `[200, 409]`.
- `'records which reviewer decided'`: `decidedBy === 'lead@x.ro'`.
- `'404 unknown case, 400 bad body'`

`cases.test.ts`, `caseList`:
- `'flags a burst'`: 3 cases created within 2 h, all with `'burst'`.
- `'no burst when reports are days apart'`: set `createdAt` 1 day apart.
- `'flags SIM change, a busy reporter, an earlier dismissal and a barred reporter'`: one fixture per sign.
- `'lists ready before awaiting, newest first, and hides decided cases'`

`review.test.tsx` (`ReviewList`, jsdom), using `CaseItem` fixtures:
- `'shows one card per case: category, date, signs and listing links'`: sign text includes `Burst`.
- `'asks once before banning, then posts { caseId, action: "ban" }'`
- `'asks once before marking a report false'`
- `'confirm warning and dismiss post at once'`
- `'a failed request shows an error and keeps the buttons'`
- `'says when nothing is waiting'`: `No reports waiting.`

`seed.test.ts`, the scammer test:
- after seeding, `d5()` is `'green'` and `caseList(db)` holds 3 cases for the scammer;
- `decideCase(db, first.caseId, 'ban', 'team@x.ro')` gives `red_banned`, and the same-ID refusal still holds;
- reseed gives `'green'` again, with 3 open cases.

`badge.test.ts`: delete `'exposes the spec thresholds'`.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @cs/web test -- app/api/review "app/(phone)/review" lib/cases.test.ts scripts/seed.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `caseList`, `decideCase`, the route and the deletions**

- [ ] **Step 4: Rewrite the queue page**

In `review/page.tsx`:
- `caseList` replaces `holdList`;
- h1 `Reports to review`;
- lead: `Each problem report waits here before it shows on a listing. Confirming a warning turns the landlord's listings amber; a ban is for life and follows the person to any new number.`

In `ReviewList.tsx`, one card per `CaseItem`:
- **Tab:** the category in words (`REPORT_CATEGORY_TEXT`) and the date.
- **Signs:** a list in plain words:
  - `Burst: other reports on this landlord within 2 hours`
  - `Reporter's SIM changed in the last 30 days`
  - `Reporter reported 3 or more landlords in 90 days`
  - `Reporter had a report dismissed before`
  - `Reporter is barred for a false report`
- **The location result**, and the **listing links**.
- **Actions:** `Confirm warning` · `Ban for life` · `Dismiss` · `False report`.
  - Ban keeps today's confirm copy.
  - False report asks once: `Mark this report false? The reporter can't report again for 2 years.`
  - **Plan's call:** the spec only requires a confirm for Ban. The 2-year bar is costly enough to justify a confirm here too.
  - When done, the card shows `Warning confirmed`, `Banned`, `Dismissed` or `Marked false`.

- [ ] **Step 5: Run the tests and typecheck**

Run: `pnpm --filter @cs/shared test && pnpm --filter @cs/web test && pnpm --filter @cs/web exec tsc --noEmit`
Expected: PASS. `grep -r "holdList\|isWarned\|AMBER_THRESHOLDS\|dismissHold\|landlordReportCounts" apps packages --include=*.ts --include=*.tsx` finds nothing outside `node_modules`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/cases.ts apps/web/lib/cases.test.ts apps/web/lib/queries.ts apps/web/app/api/review "apps/web/app/(phone)/review" packages/shared/src apps/web/scripts/seed.test.ts
git commit -m "feat(web): the team decides each report on /review, with warning signs"
```

---

### Task 5: Show the soft note on `/check` and in the extension badge

**Files:**
- Modify: `apps/web/app/(phone)/check/CheckForm.tsx`, `apps/web/app/(phone)/check/check.test.tsx`
- Modify: `apps/extension/lib/badge-ui.ts`, `apps/extension/lib/badge.css`, `apps/extension/lib/badge-ui.test.ts`

**Interfaces:**
- Consumes: `CheckResponse.underReview` and `UNDER_REVIEW_TEXT` (Task 2).

- [ ] **Step 1: Write the failing tests**

`badge-ui.test.ts`:
- `it.each(['green', 'amber'])('%s shows the under-review note when a report is open')`: `renderBadge(host, res(status, { underReview: true }), OPTS)` → the text contains `UNDER_REVIEW_TEXT`, written out verbatim.
- `'no under-review note without an open report'`

`check.test.tsx`:
- `'a verdict with underReview shows the note under it'`: mock the check response `{ status: 'green', …, underReview: true }`, so the note text is shown.
- Without `underReview`, the note is absent.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @cs/extension test && pnpm --filter @cs/web test -- "app/(phone)/check"`
Expected: FAIL

- [ ] **Step 3: Render the note**

- **Extension** (`panelFor`, green or amber): when `res.underReview`, add a note right after `landlordChecks`. Style it as a caution in the badge's design system, not the red "don't pay" alert.
- **`/check`:** under the verdict, add `<div className={s.alert} data-tone="warn" role="note">` holding `UNDER_REVIEW_TEXT`.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @cs/extension test && pnpm --filter @cs/web test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(phone)/check" apps/extension/lib/badge-ui.ts apps/extension/lib/badge.css apps/extension/lib/badge-ui.test.ts
git commit -m "feat: show 'under review' on the badge and /check while a report is open"
```

---

### Task 6: The renter's report page: sign-in gate, new refusals, copy and privacy

**Files:**
- Modify: `apps/web/app/(phone)/viewing/[verificationId]/page.tsx`, `apps/web/app/(phone)/viewing/[verificationId]/ViewingFlow.tsx`, `apps/web/app/(phone)/viewing/viewing.test.tsx`
- Modify: `apps/web/app/(phone)/privacy/page.tsx`

**Interfaces:**
- Consumes: `isSignedIn` (`lib/auth0`), and the `ReportResponse` reasons from Task 3.

- [ ] **Step 1: Write the failing tests**

`viewing.test.tsx`:
- `'a 401 signed_out asks the student to sign in'`: an alert reads `Sign in to report`, with a link to `/auth/login?returnTo=/viewing/${VID}`.
- `'a 403 barred names the contact'`: the alert reads `You can't report on ChirieSigură`, and the body contains the `/privacy` contact.
- `'a 403 own_listing refuses a landlord reporting themselves'`: the alert reads `You can't report your own listing`.
- `'a 401 not_number_verified still sends the student back to the number step'`, as today's expired path.
- `'a problem report says the team reviews it first'`: the done screen contains `Our team checks every problem report before it shows on the listing.`
- `'an ok report says it shows on the listings'`: `Your report shows on all of this landlord's listings.`

The signed-out gate follows the `/check` pattern: the server page passes `signedIn` to the client component (`CheckForm signedIn={…}`).
- `'signed out: offers sign-in and no consent screen'`: `render(<ViewingFlow verificationId={VID} signedIn={false} />)` shows a link `Sign in` to `/auth/login?returnTo=/viewing/${VID}`, and no `I agree` button.
- Existing tests render with `signedIn`.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @cs/web test -- "app/(phone)/viewing"`
Expected: FAIL

- [ ] **Step 3: Implement the gate and the flow changes**

**`page.tsx`:** pass `signedIn={await isSignedIn()}` to `ViewingFlow`. The `Flow` component already renders per request inside `Suspense`.

**`ViewingFlow.tsx`:**
- New required prop `signedIn: boolean`. When it's false, render only the signed-out screen:
  - h1 `Sign in to report a viewing`;
  - lead `Reports are for signed-in students. Sign in, and you come straight back here.`;
  - a primary link `Sign in` to `/auth/login?returnTo=/viewing/{verificationId}`.
- `Problem` gains `'signed_out' | 'barred' | 'own_listing'`;
- 401 is handled by `reason`: `not_number_verified` goes to today's `onExpired`, `signed_out` shows the sign-in alert;
- the done-screen lead depends on the category, as in the tests;
- `STUDENT_DATA.kept` adds `Sign-in hash (one-way)` and `Whether your SIM changed recently (yes/no)`.

**`/privacy`:**
- **Kept → Viewing reports:** the category, when, one-way hashes of the reporter's number **and sign-in**, and whether the SIM changed in the last 30 days, *so each phone reports once and our team can spot fake reports*.
- **Kept, new item:** *False-report bars: one-way hashes of a reporter's number and sign-in, kept 2 years when our team finds a report was false.*
- **Contest a report, paragraph 2:** problem reports never change a listing on their own. The team reviews each one; only then can a listing show a warning or a ban.

- [ ] **Step 4: Run the tests**

Run: `pnpm --filter @cs/web test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(phone)/viewing" "apps/web/app/(phone)/privacy/page.tsx"
git commit -m "feat(web): signed-in viewing reports with clear refusals and review copy"
```

---

### Task 7: Demo seed, drop the old hold column, pitch beats

**Files:**
- Modify: `apps/web/scripts/seed.ts`, `apps/web/scripts/seed.test.ts`
- Modify: `apps/web/lib/db/schema.ts`: remove `reviewDismissedAt`
- Create: `apps/web/drizzle/0005_*.sql` (generated)
- Modify: `docs/pitch.md`

**Interfaces:**
- Consumes: `caseList`, `decideCase` (Task 4), `reportCase`, `reporterBar` (Task 1).

**Seed changes:**
- **d1:** `EARLIER_NO_SHOWS` becomes `EARLIER_ALL_GOOD` with the same two numbers, category `ok`. The d1 badge starts `2 verified viewings: 2 all good`.
- **d5:** the three scam reports get `createdAt` = now − 3, 2 and 1 days, so the demo case shows no burst. Their cases are reset to `ready` (Task 2).
- **Lifting rehearsal bars:** before deleting the live report, delete `reporterBar` rows whose `caseId` belongs to a case on a demo landlord, and rows whose `hash` is a demo reporter phone hash.
- **Clean-up:** `CLEAN` and `seedScammer` drop `reviewDismissedAt`. Update the console summary.

- [ ] **Step 1: Write the failing tests**

`seed.test.ts`:
- `'reseeding lifts a rehearsal ban, an upheld warning and a false-report bar'`: replaces the dismissal test. After seeding: ban the scammer, uphold a d1 live case, and mark a case false. Reseed: no `bannedAt`, every demo case `ready`, and no `reporterBar` rows.
- `'d1 starts green with two all-good reports and no note'`: `reports.ok === 2`, `underReview` undefined.
- `'the scammer's three reports are days apart, so no burst'`: no case in `caseList` carries `'burst'`.
- Update `'reseeding puts d1 and d5 back…'` for `ok` on d1.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm --filter @cs/web test -- scripts/seed.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the seed changes, drop the column, generate the migration**

Run: `pnpm --filter @cs/web db:generate`
Expected: `0005_*.sql` contains only `ALTER TABLE "landlord" DROP COLUMN "review_dismissed_at"`.

- [ ] **Step 4: Update the pitch**

In `docs/pitch.md`:
- **Setup list (around line 17):** add *Student phone: signed in on `/check` before the demo (reports need sign-in).*
- **Beat 4 (around line 49):** after the no-show report, reload `d1`. The badge stays green and reads *"Viewers reported a problem · under review"*. Line: *"One report can't smear a landlord: our team checks it first, and students are told not to pay before they've seen the flat."*
- **Q&A ban beat (around line 68):** on `/review`, tap **Ban for life** on one of Mihai's *asked for money first* cards, then reload `d5`: 🔴 *Landlord banned*.
- Leave everything else, and the timing comment, unchanged.

- [ ] **Step 5: Run the whole suite and typecheck**

Run: `pnpm -r test && pnpm --filter @cs/web exec tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/scripts apps/web/lib/db/schema.ts apps/web/drizzle docs/pitch.md
git commit -m "feat(web): demo seed for report review; drop the landlord-level hold"
```

---

## Final verification (after Task 7)

Use the `chiriesigura-demo-run` skill for setup, mock network mode and the 390 px phone viewport (`chiriesigura-phone-pages`):

1. `pnpm --filter @cs/web db:migrate && pnpm --filter @cs/web seed`, then start the dev server.
2. **Signed out:** `/viewing/{d1 verificationId}` shows *Sign in to report a viewing*.
3. **Signed in:** file three *didn't show up* reports on d1 from three mock numbers within a minute. The d1 badge (extension and `/check`) stays 🟢 with the soft note, and `/review` shows three cards, each with **Burst**.
4. **Confirm warning** on one: d1 turns 🟠, and the report line shows *1 didn't show up*.
5. **False report** on another: that number gets *You can't report on ChirieSigură* on its next report.
6. **Ban for life** on a d5 card: d5 shows 🔴 *Landlord banned*.
7. **Reseed:** everything is back to the start state.
