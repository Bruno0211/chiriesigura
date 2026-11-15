# Verified or Banned (No Amber) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the 🟠 badge state and the Confirm warning decision, so that a landlord is either verified (🟢, with the "under review" soft note while a report is open) or banned (🔴).

**Architecture:**
- Delete `'amber'` from `BadgeStatus` and the `warned` input from `decideBadge`.
- `landlordStanding` reports only `ok` counts and `underReview`.
- Review decisions become `ban | dismiss | false_report`. A ban stores the case as `banned`.
- TypeScript's exhaustive `Record<BadgeStatus, …>` maps flag every place that still mentions amber.

**Tech Stack:** Next.js 16 (`apps/web`), Drizzle + PGlite tests, WXT extension (`apps/extension`), shared rules (`packages/shared`), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-trusted-reviews-design.md`. §8 is binding and overrides §4.5, §4.6, §4.8 and §4.13 where they mention amber, upheld cases or Confirm warning.

## Global Constraints

- **Badge statuses after the change:** `green | red_fake_code | red_copied | red_phone_mismatch | red_banned | red_far_away | grey_unverified | grey_cannot_confirm`.
- **Case statuses:** `'awaiting_landlord' | 'ready' | 'dismissed' | 'false_report' | 'banned'`.
- **Review actions:** `'ban' | 'dismiss' | 'false_report'`. `ban` needs status `ready`. `dismiss` and `false_report` work on `awaiting_landlord` or `ready`. A decided case can't be decided again.
- **Public counts:** only `ok` ("all good") counts are ever published. Problem categories are never published.
- **Soft-note copy, unchanged and verbatim:** `Viewers reported a problem · under review · never pay before you've seen the flat.`
- **Commits:** no `Co-Authored-By` or `Signed-off-by` lines. Stage only the files you changed. Don't flip CRLF/LF; the checkout is CRLF, so convert any whole-file Write back.
- **Commands:**
  - focused web tests: `pnpm --filter @cs/web exec vitest run <files>`;
  - full web suite: `pnpm --filter @cs/web exec vitest run --maxWorkers=2`;
  - `pnpm --filter @cs/shared test` and `pnpm --filter @cs/extension test`;
  - typecheck: `pnpm --filter @cs/web exec tsc --noEmit` (run `npx next typegen` in apps/web first if LayoutProps or PageProps is missing).

## Review Focus

1. **A stale `/review` tab still posts `action: 'uphold'`.** It must get 400 `bad_request`, not 500, and nothing changes.
2. **A case row left with the old status `'upheld'`** (a rehearsal before reseeding) is neither open nor published. `caseList` leaves it out, and `landlordStanding` publishes no problem count for it.
3. **A reviewer loses a race to a ban.** The card reads `Someone already decided this report: Banned`, not "Warning confirmed".
4. **A banned landlord's `/api/check` response** is `red_banned`, with no `reports`, no `underReview` and no `verificationId`.
5. **A verified landlord with a pile of open problem reports** stays `green` with `underReview: true`, and the counts line shows only "all good".

---

### Task 1: Remove the amber state and the Confirm warning decision

**Files:**
- Modify (shared):
  - `packages/shared/src/types.ts` (`BadgeStatus`)
  - `packages/shared/src/rules/badge.ts` (`BadgeInput.warned`, `decideBadge`, `LABELS.amber`)
  - `packages/shared/src/api.ts` (`ReviewAction`; the "green/amber" comments become "green")
- Modify (web):
  - `apps/web/lib/cases.ts`: `CaseStatus`; `Standing` and `landlordStanding` (drop `warned`, the upheld query and `UPHELD_MS`); `DECISIONS` (drop `uphold`; `ban` goes to `'banned'`)
  - `apps/web/app/api/check/route.ts`: no `warned`; the verified branch is `status === 'green'` only
  - `apps/web/app/api/review/route.ts`: `ACTIONS`
  - `apps/web/app/(phone)/review/ReviewList.tsx` and `apps/web/app/(phone)/review/page.tsx`
  - `apps/web/app/(phone)/viewing/[verificationId]/ViewingFlow.tsx` (problem-report done copy)
  - `apps/web/app/(phone)/privacy/page.tsx`
- Modify (extension):
  - `apps/extension/lib/badge-ui.ts`: `TONE.amber`, the `case 'amber'`, and the `warn` argument of `reports()`
  - `apps/extension/lib/badge.css`: delete `.reportWarn` if nothing else uses it
  - `apps/extension/lib/messages.ts` (status map) and `apps/extension/entrypoints/background.ts` (`ACTION.amber`)
- Tests:
  - `packages/shared/src/rules/badge.test.ts`
  - `apps/web/lib/cases.test.ts`, `apps/web/app/api/review/review.test.ts`, `apps/web/app/api/check/check.test.ts`
  - `apps/web/app/(phone)/review/review.test.tsx`, `apps/web/app/(phone)/check/check.test.tsx`, `apps/web/app/(phone)/viewing/viewing.test.tsx`
  - `apps/web/scripts/seed.test.ts`
  - `apps/extension/lib/badge-ui.test.ts`, plus any extension test that lists statuses

**Interfaces:**
- Produces:
  - `type ReviewAction = 'dismiss' | 'false_report' | 'ban'`
  - `type CaseStatus = 'awaiting_landlord' | 'ready' | 'dismissed' | 'false_report' | 'banned'`
  - `interface Standing { counts: ReportCounts; underReview: boolean }`, where `counts` holds only `ok`
  - `BadgeInput` without `warned`
  - `BadgeStatus` without `'amber'`

- [ ] **Step 1: Write the failing tests**
  - `badge.test.ts`:
    - delete the amber cases;
    - in the `input()` helper and the far-away test, drop `warned`;
    - keep `'5: registered listing → green'`;
    - drop `amber` from the verbatim-copy test.
  - `cases.test.ts`:
    - replace `'an upheld case warns and counts publicly'` with `'a banned case publishes no problem count'`: `addCases(..., 'no_show', 1, 'banned', new Date())` gives standing `{ underReview: false }` and `counts.no_show === 0`;
    - delete the 2-year upheld test;
    - add `'a legacy upheld case is neither open nor published'` (Review Focus 2): insert a case with status `'upheld'`, then expect standing `{ underReview: false, counts.no_show: 0 }` and expect `caseList` to leave it out;
    - `decideCase(..., 'ban', ...)` sets status `'banned'`;
    - the double-ban test and the §4.7 test keep working with `'ban'`.
  - `review.test.ts`:
    - delete `'uphold turns the badge amber'`;
    - add `'a stale uphold action is a bad request'` (Review Focus 1): 400 and the case is still `ready`;
    - `'ban …'` expects check `red_banned` and the case status `'banned'`;
    - `'awaiting the landlord'`: `ban` is 409 `not_ready`, and `dismiss` is 200;
    - double decision: `Promise.all` of `ban` and `dismiss` gives `[200, 409]`;
    - the 409 `already_decided` body carries `status: 'banned'` when the winner banned.
  - `check.test.ts`:
    - replace the amber test with `'problem reports never turn the badge from green'` (Review Focus 5): three `ready` cases on another verification of the same landlord give `status: 'green'`, `underReview: true` and `reports` undefined;
    - add `'a banned landlord answers red with nothing else'` (Review Focus 4): `{ status: 'red_banned' }`, and `reports`, `underReview` and `verificationId` are all undefined.
  - `review.test.tsx`:
    - the card has exactly three action buttons, `Ban for life`, `Dismiss` and `False report`, and no `Confirm warning`;
    - a lost race to a ban shows `Someone already decided this report: Banned` (Review Focus 3).
  - `check.test.tsx`: drop or convert amber verdict fixtures to green.
  - `viewing.test.tsx`: a problem report's done screen contains `Our team checks every problem report. If it confirms a scam, the landlord is banned on all of their listings.`
  - `seed.test.ts`: rehearsal steps that used `uphold` use `ban` or `dismiss`; after reseeding, every demo case is `ready` and nobody is banned.
  - `badge-ui.test.ts`:
    - `LABELS` and `STATUSES` without `amber`;
    - `it.each(['green', 'amber'])` becomes green-only tests;
    - the soft-note tests run on green.
- [ ] **Step 2: Run them to verify they fail**
  - Run: `pnpm --filter @cs/shared test`, `pnpm --filter @cs/extension test`, and `pnpm --filter @cs/web exec vitest run lib/cases.test.ts app/api "app/(phone)" scripts/seed.test.ts`
  - Expected: FAIL. The new tests expect `banned`, three buttons, the new copy and 400 on `uphold`.
- [ ] **Step 3: Implement the removals and renames listed under Files**
  - **`/review` page lead (verbatim):** `Each problem report waits here. Ban for life blocks the landlord on every listing and follows the person to any new number; Dismiss and False report leave the landlord verified.`
  - **`ReviewList` done labels:** ban → `Banned`, dismiss → `Dismissed`, false_report → `Marked false`.
  - **`ReviewList` lost-race outcome map:** `banned` → `Banned`, `dismissed` → `Dismissed`, `false_report` → `Marked false`.
  - **`ViewingFlow` done lead for a problem category (verbatim):** `Thank you. Our team checks every problem report. If it confirms a scam, the landlord is banned on all of their listings.` The `ok` copy is unchanged.
  - **`/privacy`, the "Contest a report" paragraph:** the clause saying only after review "can a listing show a warning or a ban" becomes `only a ban by our team changes a listing`. Keep the rest.
  - **`/check` and the extension badge:** keep rendering the soft note for `green` when `underReview` is set.
- [ ] **Step 4: Run everything**
  - Run: `pnpm --filter @cs/shared test && pnpm --filter @cs/extension test && pnpm --filter @cs/web exec vitest run --maxWorkers=2 && pnpm --filter @cs/web exec tsc --noEmit`
  - Expected: all PASS and tsc clean. `grep -rnE "'amber'|uphold|'upheld'|warned|Confirm warning|warnings from viewers" apps packages --include=*.ts --include=*.tsx` (excluding node_modules) finds only the legacy-`upheld` test fixture.
- [ ] **Step 5: Commit**

```bash
git add packages/shared/src apps/web/lib apps/web/app apps/web/scripts apps/extension/lib apps/extension/entrypoints
git commit -m "feat: a landlord is verified or banned — remove the amber state and Confirm warning"
```
