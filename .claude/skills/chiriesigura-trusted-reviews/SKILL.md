---
name: chiriesigura-trusted-reviews
description: Use when editing trusted reviews, reports, or cases.
category: domain-rules
---

Trusted-review work follows the spec and the stage plan in the repo. The invariants below hold in every stage. Spec §8 (2026-11-15) overrides older text: a landlord is verified (🟢) or banned (🔴). There is no 🟠 state and no Confirm warning.

- Authority: the spec at `docs/superpowers/specs/2026-11-15-trusted-reviews-design.md` binds; the stage plan `docs/superpowers/plans/2026-11-15-trusted-reviews-stage-1.md` argues for it.
- Never store raw phone numbers or Auth0 `sub` values. Hash with keyed HMAC using `PHONE_PEPPER` (`lib/hash.ts`); the account hash uses the prefix `account:`.
- Case statuses are exactly `awaiting_landlord`, `ready`, `dismissed`, `false_report`, `banned`. Stage 1 creates cases as `ready`. Legacy `upheld` rows from before spec §8 are neither open nor published. A rehearsal database holding them needs a reseed, because the readers ignore them.
- The report route's refusals are separate contracts: 401 `signed_out` means sign in; 401 `not_number_verified` means re-verify the number; 403 `barred` shows the contact message; 403 `own_listing` and the location refusal each have their own reason. Every caller (such as `ViewingFlow.tsx`) must map each reason; sending every 401 to re-verify or every 403 to "not at the address" is a defect.
- Stage 1 retention: a false-report bar lasts 2 years (`expires_at`). A ban's case record is kept as the ban's decision record; the 2-year rule does not apply to it.
- `landlord.reviewDismissedAt` is dropped by stage 1's last task (spec §5: "`landlord.review_dismissed_at` goes away"), and only after a `grep` finds no reader left. Until then, do not remove it.
- Decisions are exactly `ban`, `dismiss` and `false_report`; the /review card labels them Ban for life, Dismiss and False report. `ban` needs a `ready` case; `dismiss` and `false_report` also accept `awaiting_landlord`. There is no Confirm warning. A decided case is never decided again: of two racing decisions exactly one lands and the other gets 409. The /review card reads the 409 body: `already_decided` shows the recorded outcome and removes the buttons; `not_ready` shows the waiting note and keeps them; only network errors and 5xx keep the generic "Try again".
- `ban` runs `banPerson` (`lib/queries.ts`), which spreads only through the ID-card hash; the landlord's identity stays hidden.
- `banPerson` sets `landlord.bannedAt` only while it is null, so a second ban keeps the first date. Keep a test for that guard: double bans are reachable through one person's sibling open cases. A ban records case status `banned`; who banned lives only in `landlord.bannedAt`.
- `false_report` bars both reporter hashes (phone and account) from filing again; their other open cases get a warning sign.
- Warning signs: burst (another case on the same person within 2 h); reporter history (cases against 3+ distinct landlords in 90 days, or an earlier `dismissed` case); SIM swap via `network().simSwapped(e164, 720)`.
- A SIM-swap check that fails never blocks a renter: the report is accepted with `sim_swapped` null. An expired bar (`expires_at` in the past) does not block reporting.
- Soft note (spec §4.8, §8): while a landlord has an open case, `GET /api/check` returns `underReview: true`, and the extension badge and `/check` show "Viewers reported a problem · under review · never pay before you've seen the flat." An open case never changes the status: a verified landlord stays 🟢 until a ban. Problem counts are never published; only "all good" counts are public.
- Problem reports never change a listing on their own: the team reviews each one first (spec §4.13).
- The report route refuses by reason, and each reason needs its own phone copy: 401 `signed_out` (sign in), 403 `barred` (contact message), 403 `own_listing` (a renter whose phone hash belongs to the landlord being reviewed), 403 `not_at_address` (existing message). An unknown 403 reason falls back to `not_at_address`; a test should pin that fallback.
- The consent screen and `/privacy` list exactly what the report route stores (the sign-in hash, the SIM-changed flag, the reporter account hash). Change the copy and the route together, so neither names a field the other does not keep. The `/privacy` "Contest a report" paragraph must say, verbatim: "Problem reports never change your listings' verdict on their own: while our team reviews one, your listings show a note that a report is under review. Only a ban by our team changes the verdict." Keep the rest of the paragraph (confirmed report, lifetime ban, refusal, email us).
