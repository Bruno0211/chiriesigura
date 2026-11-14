# Landlord ban by ID, and viewing reports from a phone

**Date:** 2026-11-14 · **Status:** draft for team approval · Builds on [2026-11-13-rental-trust-layer-design.md](2026-11-13-rental-trust-layer-design.md)

## 1. Why

- **Ban:** a judge suggested using the ID as a check so a proven scammer is banned for life. Today a landlord *is* a phone number (`landlord.phone_hash`). The ID goes to the operator's KYC Match and is thrown away, so a scammer with bad reports buys a new SIM, verifies again with the same ID, and starts clean. We want to close that, and **show it live in the demo**.
- **Phone reports:** a student at a viewing usually has only their phone. Reports open only from the QR in the extension panel, and phones have no extensions, so on site there is no way in.

## 2. Goals, non-goals, anti-goals

**Goals**
- Viewer reports put a landlord **on hold**. The team **confirms or dismisses** a ban on a team-only phone page.
- A confirmed ban is **for life and follows the person**, not the SIM:
  - every listing that carries their code shows 🔴 *Landlord banned*;
  - verifying again with any phone number is refused at the identity step.
- A student on site with only a phone can file a viewing report through `/check`.

**Non-goals (this weekend)**
- An appeal flow. The `/privacy` contact covers it, as it already does for wrong reports.
- Banning without reports (by hand, or from outside evidence).
- CNP. KYC Match doesn't confirm it, so a scammer could invent one.

**Anti-goals**
- **A ban without a human decision.** Reports alone never ban anyone.
- **Storing a readable ID.** We keep only keyed hashes that can answer "is this a banned person?" and can't be turned back into a name or number.
- **The reviewer seeing who the landlord is.** The `/review` page shows reports and listing links, never names or IDs.

## 3. Approaches considered

**Ban fingerprint (team picked option 1)**
1. **Two keyed hashes: the ID card number, and name + birthdate.** A match on *either* one means it's the same person. **Picked.**
   - Both values are confirmed by KYC Match, so they can't be made up.
   - The card hash catches the same person under another name. The name + birthdate hash catches them with a new ID card.
   - Gaps:
     - Someone who changes their name *and* gets a new card gets through.
     - An innocent person with the same name and birthdate as a banned one gets refused. The refusal names the contact.
2. **CNP.** Lifelong and unique, but not confirmed by the operator, so it can be invented. Rejected.
3. **Card number only.** A new ID card resets the ban. Rejected.

**Who decides a ban (team picked)**
- Reports put the landlord on hold and the team confirms. Picked.
- Banning automatically at a report threshold was rejected: a group of people could get an innocent person banned for life.

**Review screen:** one sensible way.
- A team-only phone page, `/review`. Access uses the existing Auth0 login, limited to an email allowlist.
- A command-line script was rejected because there'd be nothing to show on stage. Auth0 roles were rejected as more setup for no gain.

**Phone reports:** one sensible way.
- `/check` already returns `verificationId` for 🟢 and 🟠. Its result just doesn't link to `/viewing`. Add that link.
- Rejected:
  - Typing the listing code on a report page. Scammers paste the same code into copies, so the report could hit the honest landlord.
  - A QR shown by the landlord. The person being reviewed would control access, and a no-show can't show one.

## 4. Design

### 4.1 Data (one Drizzle migration)
On `landlord`, add these nullable columns:

| Column | What it holds |
|---|---|
| `id_doc_hash` | keyed hash of the ID card number |
| `name_birth_hash` | keyed hash of name + birthdate |
| `banned_at` | when the team confirmed a ban |
| `review_dismissed_at` | when the team last dismissed the hold |

Hashing:
- Add `identityHash(kind: 'id' | 'name', value)` to `lib/hash.ts`. It's the same HMAC as `phoneHash` with `PHONE_PEPPER`, with the kind prefixed so the two hashes can never collide.
- Normalize before hashing:
  - **ID number:** uppercase, letters and digits only (`tm 123456` → `TM123456`).
  - **Name + birthdate:** `given|family|YYYY-MM-DD`; names lowercased, diacritics stripped (ș→s), spaces collapsed.

### 4.2 `/api/verify/identity`
- **After KYC passes**, compute both hashes. Only then are the values operator-confirmed.
- If any landlord with `banned_at` set matches either hash:
  - answer `{ ok: false }` with the `kyc` step failed and the message *"You can't verify with ChirieSigură. If you think this is a mistake, contact us."* The `/verify` page shows the privacy contact;
  - create no landlord or verification row.
- Otherwise, store both hashes on the landlord row (insert or update, like the other `*_at` fields).

### 4.3 Hold, ban, dismiss
**On hold** means all of these:
- the existing amber thresholds are met (`warned(reports)` in `packages/shared/src/rules/badge.ts`);
- `banned_at` is null;
- either `review_dismissed_at` is null, or a report arrived after it.

`POST /api/review` with `{ landlordId, action: 'ban' | 'dismiss' }`, team only:
- **ban:** set `banned_at = now` on that landlord **and every landlord row sharing either hash**, so the person's other phone numbers are banned too.
- **dismiss:** set `review_dismissed_at = now`.

### 4.4 Badge
- Add `red_banned` to `BadgeStatus`, labelled **"Landlord banned"**.
- In `decideBadge`, check it right after the code resolves to a verification, before the copied and phone checks. Any page carrying a banned landlord's code shows it.
- `findVerificationByCode` returns the landlord's `banned_at`, so the badge decision can see it.
- The check response for `red_banned` carries no `verificationId`, so there's no report QR or link.
- The extension's per-status maps (`badge-ui.ts`, `messages.ts`, background `ACTION`) get the red tone. TypeScript flags every map that's missing it.

### 4.5 `/review` (team only, phone page)
- **Access:** an Auth0 session whose email is in `REVIEW_EMAILS` (comma-separated env var) **and** whose `email_verified` is true. Anyone else gets 404 on the page and 403 from the API.
- **Layout:** the same layout and components as `/verify` and `/viewing` (see the `chiriesigura-phone-pages` skill). Each landlord on hold gets one card:
  ```
  On hold · 3 asked for money first · 1 didn't show up
  Last report 14 Nov · 2 listings: demo/d5, olx/…
  [ Confirm ban ]   [ Dismiss ]
  ```
- Confirm asks once: *"Ban this person for life? Every listing and any new verification with the same ID is blocked."*
- Afterwards, the card shows *Banned* or *Dismissed* and drops off on reload.
- An empty list says *"No landlords on hold."*

### 4.6 `/check` report link
- On 🟢 and 🟠 results, show a primary button, **"I'm at the viewing · Report it"**, linking to `/viewing/{verificationId}`. That's the same URL the extension QR encodes.
- On any other status, don't show it.

### 4.7 Demo
- **Seed** (`scripts/seed.ts`): a scammer landlord.
  - Mock number `+40700000009`, which passes everything.
  - Identity hashes from the inputs Mihai Ionescu, 1990-07-15, ID `TM654321`.
  - A verification near a Timișoara address, listing `demo/d5`, and 3 `money_upfront` reports, so it starts **on hold**.
  - The seed clears `banned_at` and `review_dismissed_at`, so every rehearsal starts the same.
- **Demo listing** `d5`: a cheap 2-room flat near Complex Studențesc, with the code `VC-BAN5` in its text.
- **Live beats** (about 40 s):
  1. Team phone, `/review`: **Confirm ban**.
  2. Laptop, `d5`: 🔴 *Landlord banned*.
  3. Second phone, `/verify` with number `0700000010` and the same Mihai Ionescu details: refused at the identity step.
- **`docs/pitch.md`:**
  - add these beats and the demo inputs;
  - change step 4 to show the student reporting from `/check` on their phone instead of scanning the laptop QR;
  - change the privacy line to *"we keep a fingerprint that can only answer: is this a banned person?"*;
  - the pitch owner decides what to trim to stay within 3:00.
- **`/privacy`:** one paragraph on the two fingerprints, the lifetime ban, and the contact.

### 4.8 Tests
- `decideBadge` returns `red_banned` for a banned verification, ahead of `red_copied`.
- Identity route:
  - a banned person's new number is refused, matched by the card hash alone and by the name hash alone;
  - no rows are created.
- Review API:
  - a non-team email gets 403;
  - ban also bans a second landlord row with the same name hash;
  - dismiss takes the landlord off hold until a new report arrives.
- `/check` shows the report link for green and amber only.

## 5. Left to the builder
- Exact copy and styling within the phone-page system.
- Migration naming, query shape, and splitting the work into tasks.
- `/check`: whether the button also shows on the signed-out state. Not required, since signed-out users get no verdict.
