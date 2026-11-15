# Trusted renter reviews and scam reports: design

**Date:** 2026-11-15 · **Status:** approved by the team · **Size:** project (three stages) · Builds on [2026-11-14-landlord-ban-and-phone-review-design.md](2026-11-14-landlord-ban-and-phone-review-design.md)

## 1. Context: why

Today any phone that passes the operator number check and is within `LOCATION_RADIUS_M` (2 km) of a verified address can report any verified landlord, at any time (`apps/web/app/api/viewing/report/route.ts`). Nothing ties the reporter to a real viewing, and the reporter needn't be a signed-in student. Two "asked for money first" reports (`AMBER_THRESHOLDS`, `packages/shared/src/rules/badge.ts`) turn the badge 🟠 on all the landlord's listings at once and put them on hold. The team's `/review` card shows only counts and listing links, so **Confirm ban** is a rubber stamp. A few friends standing near a flat can smear or ban an honest landlord.

Two more gaps:
- **Self check-in:** the landlord never meets the renter. The location check still places the renter there, but can't tell a real renter from a bystander.
- **Paid, never got in** (the "send the deposit" scam in `docs/pitch.md`): the victim can't report at all without travelling to the address.

**What the team wants:** renters can leave a review, good or bad, and report a scam in every scenario (met in person, self check-in, never got in). Fake reports should cost more than they're worth, honest landlords get heard before anything goes public, and real scammers still get flagged and banned. No system is bulletproof: real people who really rented can lie together. Each layer raises the cost, and a human decides.

## 2. Goals, non-goals, anti-goals

**Goals**
- A report counts according to **proof of a real deal**: a renter pass from the landlord, or evidence.
- Renters can leave **good** reviews as well as problem reports.
- Reports never change the badge colour on their own: a **soft note** while under review, 🟠 or 🔴 only after the team decides.
- The **landlord is told by SMS** and gets 72 h to answer before the team decides.
- The team sees **both sides and warning signs** for each report, and can mark a single report false.
- Someone caught filing a false report **loses the right to report**.
- Personal data is handled in line with **GDPR** (§4.13).

**Non-goals (this project)**
- An ID check (KYC) for renters.
- Public written reviews and star ratings.
- Decay that weighs older warnings less. An upheld case counts in full until its retention period ends (2 years, §4.13).
- The legal and compliance work in §4.14. It's needed before a real launch, but it isn't code.
- Logging which listings a student checks.
- Payments or escrow through ChirieSigură.
- An appeal screen. The `/privacy` contact still covers appeals.
- Automatic detection of edited images.

**Anti-goals**
- Any public warning or ban without a human decision.
- Publishing a renter's note, photos or identity, or telling the landlord who reported.
- After stage 3, any public effect from a report that has neither a pass nor evidence.
- Keeping a renter's phone number. A hash only, as today.

## 3. Approaches considered

**Proof that a renter really dealt with the landlord** (team picked 1)
1. **Renter pass, with evidence as the fallback.** Picked. Bystanders can produce neither. The earlier spec rejected a landlord-shown QR because the landlord would control who can report. The evidence path fixes that: a renter without a pass can still report.
2. Evidence only. Rejected: screenshots are easy to fake, the team holds more personal data, and every report needs a reviewer's time.
3. Location plus warning signs only. Rejected: a victim who paid and never got in still can't report, and bystanders still count.

**What students see before review** (team picked 1)
1. **The badge stays 🟢 with a soft note.** Picked. 🟠 or 🔴 only after the team decides.
2. No change until the team decides. Rejected: a real scammer looks clean.
3. Instant 🟠, made harder to trigger. Rejected: a determined group can still do public damage.

**Review content:** team picked **fixed tags plus an optional note**.

**Telling the landlord:** team picked **SMS, then 72 h to answer**. Rejected: the landlord page only (an honest landlord who never opens it never answers), and no reply step at all.

**Keeping the landlord's number for SMS:** team picked **required and encrypted**, with GDPR covered. Rejected: opt-in at `/verify` (a landlord who declines gets the rejected "page only" outcome), and dropping SMS.

**How it's built** (team picked A)
- **A. One case per problem report.** Picked. Every decision belongs to a single report (its 72 h clock, its evidence, its false-report penalty), so the team can rule on that report alone.
- B. Extend today's landlord-level hold. Rejected: a fake burst and a later real report would share one decision, and a false reporter can't be singled out.

## 4. Design

### 4.1 Who can submit
- A renter must be **signed in through Auth0** (`isSignedIn`, `lib/auth0`) **and** pass the operator number check (`readNv`, `lib/nv-session.ts`).
- Store two keyed hashes per submission: the phone (`phoneHash`) and the Auth0 `sub`. Use the same HMAC with its own kind prefix, like `identityHash` in `lib/hash.ts`.
- A **barred** reporter (§4.7) gets 403 with the contact message.
- A renter whose phone hash belongs to the landlord being reviewed is refused.

### 4.2 Renter pass
- **Landlord page `/landlord`** is a new phone page in the `(phone)` group, using the same components as `/verify`. The landlord passes the number check, and the page finds their `landlord` row by phone hash.
  - It lists the landlord's verified flats.
  - **Create pass:** pick the flat, the kind (viewing or stay), the start date and, for a stay, the end date. The page returns a link `/pass/{token}`, which the landlord sends over their usual chat.
- **Renter opens `/pass/{token}`:** they sign in and pass the number check, and the pass is bound to their phone and account hashes.
  - A pass can be claimed once. It expires 7 days after creation if nobody claims it.
  - We store only a hash of the token.
- **Review window:** from the pass start date until 30 days after its end date. A viewing pass ends the same day it starts.
- A pass holder needs **no location check**, which covers self check-in and long stays.

### 4.3 The review form (renter)
- **Good tags:** matched the photos · deposit returned · easy check-in · responsive.
- **Problem tags:** asked for money first · didn't show up · couldn't get in · doesn't match the listing · not the verified landlord · deposit not returned. These are today's `ReportCategory` problem values plus `couldnt_get_in` and `deposit_not_returned`.
- **Optional note:** up to 500 characters, **read only by the team**, never published, and deleted 90 days after the case is decided.
- **What happens on submit:**
  - Any problem tag opens a **case** (§4.5). The review's good tags wait with the case.
  - Good tags only, from a pass holder: published right away, **unless** the pass shows a warning sign (§4.6). Then it waits in `/review` like a case.
  - **No pass:** only problem tags are allowed, and evidence is required (§4.4).
- **Limits:** one review per pass, which the renter can **add to** until the window closes. "Easy check-in" is known on day one; "deposit returned" or "deposit not returned" only at the end.
  - Adding a problem tag later opens a case then.
  - Good tags already published stay published unless that case is upheld.
- **Without a pass:** one case per renter per flat.

### 4.4 Evidence
- **On-site photos:**
  - Taken through the page's camera (a live camera stream, not a file picker), up to 5 per submission.
  - In the same request, the server runs the operator location check (`network().verifyLocation`, as today).
  - Photos are stamped *taken on site · time · TRUE/PARTIAL* only when that check passes.
  - Required for "couldn't get in" without a pass.
- **Uploads:** chat or payment screenshots from the gallery, up to 5. They're marked **not taken on site** and no location check is needed, which covers "paid and never got in".
- **Storage:**
  - A private store that serves files only through short-lived signed links (e.g. Vercel Blob; check that it supports private files).
  - The server strips image metadata (EXIF, GPS) before storing.
  - Files are deleted 90 days after the case is decided.
- **Who sees it:** only the team. The landlord never sees the renter's evidence or note, and the renter never sees the landlord's.

### 4.5 Case life
States: `awaiting_landlord` → `ready` → decided as `dismissed`, `false_report`, `upheld`, or `upheld` plus a ban.

1. **A case opens.** We text the landlord: *"A renter reported a problem with your listing. Answer within 72 hours: {link}"*. The text never says who reported. Status: `awaiting_landlord`, with a deadline of now + 72 h.
2. **The landlord answers** on `/landlord?case={id}`, after the number check. They see the problem tags and the date only. They answer with their own tags or note and photos or uploads, using the same rules as §4.4.
3. The case becomes `ready` when the landlord answers or the deadline passes. A scheduled job, or a check on read, handles the deadline.
4. **The team decides on `/review`.**
   - **Dismiss:** no public effect, and the reporter isn't affected.
   - **False report:** the reporter is barred (§4.7).
   - **Confirm warning:** the case's problem tags count publicly, and the badge turns 🟠.
   - **Ban for life:** confirms the warning and runs today's `banPerson` (`lib/queries.ts`), which spreads only through the ID card hash.
   - Dismiss and False report work at any time. Confirm warning and Ban need the case to be `ready`.

### 4.6 `/review` (team only, same access as today)
- **One card per case**, newest `ready` first. It shows:
  - the renter's tags, note and evidence, each marked on-site or not;
  - the landlord's answer, or *"No answer in 72 h"*;
  - the listing links;
  - the warning signs below.
- **The four actions** from §4.5. Ban keeps today's confirm step.
- **Warning signs**, worked out by the server:
  - **Burst:** other cases on the same landlord opened within 2 h of this one. This is the "gather at the property" pattern.
  - **No pass:** evidence only, or off-site evidence only.
  - **Reporter's SIM changed in the last 30 days:** `network().simSwapped(phone, 720)`, recorded at submission.
  - **Reporter history:** cases against 3 or more landlords in 90 days, or an earlier dismissed case.
  - **Pass farming** (for good reviews):
    - the pass was claimed within 10 minutes of being created;
    - the review came within 30 minutes of the claim;
    - the landlord created 5 or more passes in 24 h.
- The landlord's identity stays hidden, as today.

### 4.7 False reporters
- A `false_report` decision bars both of the reporter's hashes (phone and account) from filing again. Their other open cases get a warning sign.
- The bar lasts 2 years (§4.13 retention). The appeal route is the `/privacy` contact.

### 4.8 Badge, `/check`, extension
- **🟠** when the landlord has at least one upheld case. It replaces `isWarned` and the count thresholds. **🔴 Landlord banned** works as today.
- **Warnings follow the person, not the SIM,** just as bans do. Upheld cases, open cases (the soft note) and public counts are gathered across every `landlord` row that shares the same `id_doc_hash`, so a new SIM doesn't reset a warning.
- **Soft note** when the landlord has a case in `awaiting_landlord` or `ready`. The status stays 🟢 and `CheckResponse` gains `underReview: true`. Badge copy: *"Viewers reported a problem · under review · never pay before you've seen the flat."*
  - It never names the problem until the team confirms it.
- **The public counts line** draws on good tags from published reviews and problem tags from upheld cases only. `reports` in `CheckResponse` becomes tag counts. The extension's per-status maps (`badge-ui.ts`, `messages.ts`, background `ACTION`) and the `/check` page render the new note.
- **The `/check` report button** links to the no-pass report path. A pass holder reaches their review from the pass link.

### 4.9 Landlord SMS
- Add a new `Sms` interface beside `lib/network`: `send(e164, text)`. It has a mock mode for tests and the demo, and a real provider (an account the team creates).
- **Number kept, required and encrypted (team picked).**
  - `/verify` stores the number the operator just confirmed, encrypted (e.g. AES-256-GCM). The key lives in its own env var, separate from `PHONE_PEPPER` and from the database.
  - Only the SMS sender decrypts it. It's never logged and never shown in full; the landlord page shows it masked (`maskPhone`).
  - The `/verify` consent screen moves *"Phone number"* from *never kept* to *kept: "Phone number, encrypted, only to text you about reports"*.
- The text stays minimal: no renter details and no listing text. The provider sees only the number and that sentence.

### 4.10 Copy and privacy
- **Renter consent screen** (`ViewingFlow.tsx` `STUDENT_DATA`, plus a new pass and review flow). Kept: tags, note (team only, 90 days), photos and uploads (team only, 90 days), number and account hashes. Remove *"Any free text: never kept"*.
- **Landlord consent:** add renter passes and the encrypted number (§4.9).
- **`/privacy`:** new paragraphs on passes, evidence, notes, the encrypted landlord number, retention, false-report bars, the landlord's reply, and each person's rights (§4.13).

### 4.11 Stages
Each stage ships on its own and leaves the app working.
1. **Contain the abuse. No new services.**
   - Add the case table, created from today's single-category reports.
   - The soft note replaces instant 🟠, and `/review` gets the four actions and the warning signs (burst, history, SIM change).
   - Reporting requires sign-in, and false-report bars apply.
   - The at-address rule stays the proof for now. The landlord reply waits for stage 3, so the team can decide at any time.
   - "All good" reports from the address keep publishing as today until stage 2, when good tags need a pass. Problem counts that haven't been reviewed are hidden from stage 1 on.
   - **Honest limit:** bystanders can still open a case, but all they get publicly is the soft note, and the reviewer sees the burst.
2. **Passes and tag reviews.**
   - Add the `/landlord` page with pass creation, `/pass/{token}`, the tag form with its note, good reviews publishing, and the pass-farming signs.
3. **Evidence and landlord reply.**
   - Add photos and uploads with private storage, the encrypted number, SMS, the 72 h window and the landlord's answer page.
   - **A report now needs a pass or evidence.** The at-address-only path closes.

### 4.12 Tests (key ones)
- A problem report never changes the badge status. It sets `underReview`. An upheld case gives 🟠, and a ban gives 🔴.
- Confirm warning and Ban are refused while a case is `awaiting_landlord`. Dismiss and False report work.
- A barred reporter gets 403 on both hashes. A landlord can't review themselves through a pass.
- A pass can be claimed once, expires unclaimed, and refuses reviews outside its window.
- Without a pass, the server refuses a submission with no evidence, and "couldn't get in" needs an on-site photo with a passing location check.
- Evidence and note URLs are reachable by the team only. Image metadata is stripped.
- The burst sign appears when 3 cases land within 2 h.
- GDPR:
  - the landlord's number is stored only encrypted and never appears in any API response or log;
  - the deletion job removes notes and evidence 90 days after a decision, and upheld cases after 2 years;
  - opening evidence writes an access-log row;
  - a renter can withdraw an undecided review.
- Seed and demo: `scripts/seed.ts` resets cases, passes and bars, and the pitch beats in `docs/pitch.md` are updated to match.

### 4.13 GDPR (team asked: we store personal data, so it must comply)
The build has to do what's below. A lawyer still needs to check it before a real launch (§4.14).

**What we keep, why, for how long, and who sees it**

| Data | About whom | Why | Kept for | Who sees it |
|---|---|---|---|---|
| Landlord phone number (encrypted) | landlord | text them about reports | until they delete their account, or 12 months after their last verified listing | nobody; only the SMS sender reads it |
| Renter phone and account hashes | renter | one review per pass; false-report bars | as long as the review is kept; a bar lasts 2 years | nobody (one-way) |
| Review and case tags and dates | landlord, renter | warn renters | upheld: 2 years, then deleted; dismissed or false: 90 days | public counts only after a decision |
| Renter note, photos, uploads | renter, landlord, other people in them | the team's decision | 90 days after the decision | team only |
| Landlord's answer (note, photos) | landlord | the team's decision | 90 days after the decision | team only |
| Decision record (outcome, when, which reviewer) | landlord, renter | accountability, appeals | as long as the outcome stands | team |
| Log of who opened evidence | team | accountability | 1 year | team |

- A scheduled job deletes everything when its period ends.
- An upheld warning now drops off after 2 years. A ban stays for life, with its ID hashes, as the team already decided.

**Built in**
- **Data minimisation:** hashes instead of numbers wherever possible, fixed tags, team-only notes and evidence, and image metadata stripped.
- **No automated decisions with public effect:** every warning and ban is a human decision, as in the anti-goals.
- **Telling people:**
  - Renters and landlords see what's kept and why on the consent screens and `/privacy`.
  - A landlord learns about each report through the SMS. Data collected about someone from another person has to be disclosed to them, and the SMS does that.
- **Upload notice:** *"Cover other people's names, numbers and faces where you can. Only our team sees this."* Screenshots and photos can show third parties.
- **Security:**
  - the number is encrypted, with its key kept apart;
  - evidence is reachable only through short-lived signed links, for reviewers;
  - every time evidence is opened, it's logged;
  - reviewer access stays as today (`REVIEW_EMAILS` plus a verified email).
- **People's rights, this round:**
  - **Renters:** can withdraw their own review, with its evidence, until the case is decided. After that, through the contact.
  - **Landlords:** answer every report on `/landlord`. They can delete their account there, which removes the number, passes and listings. Upheld cases and bans stay for their retention period because they protect renters; this needs the balancing test in §4.14.
  - **Access requests** go through the `/privacy` contact and are handled by hand. A landlord's copy leaves out who reported and the renter's note and photos, since those are other people's data.
- **Providers:** keep data in the EU where the provider allows it. That means Vercel Blob and database regions, and an SMS provider with EU processing.

### 4.14 Before a real launch (not part of the build)
- **A data protection impact assessment (DPIA).** Network location, fraud reports about named people, and lifetime bans make one likely to be required.
- **A legitimate-interests assessment** for keeping reports and bans about landlords.
- **A lawyer's check on scam allegations.** They may count as data about criminal offences (GDPR Art. 10, Romanian Law 190/2018), which can only be processed on a legal basis. This could change what we're allowed to store.
- **Paperwork:** signed processing agreements with Auth0, Vercel, the database host, the SMS provider and the network API provider; records of processing; a breach procedure; a named privacy contact.

## 5. Left to the builder
- Table and column names, the migration, and query shape. Suggested tables: `renter_pass`, `review`, `case`, `evidence`, `reporter_bar`. `landlord.review_dismissed_at` goes away.
- Exact copy, tag wording and layout within the phone-page system (`chiriesigura-phone-pages` skill).
- File limits (count, size, formats such as HEIC), how deadlines and deletion are scheduled (e.g. Vercel cron), and the SMS provider.
- What to do with today's `viewing_report` rows. The data is test-only, so reseeding is fine.
- Read `node_modules/next/dist/docs/` before writing Next.js 16 code.

## 6. Calls made while writing this, for the team to check
- The 30-day review window, the 7-day pass expiry, and the 90-day deletion.
- The landlord sees the tags and the date only, never the renter's note, photos or identity.
- A good review from a pass that shows farming signs waits for review instead of publishing.
- A false-report bar lasts 2 years, not for life (GDPR storage limits).
- An upheld warning is deleted after 2 years. The landlord's number is deleted 12 months after their last verified listing.
- A single upheld case is enough for 🟠.
- Dropped: the "never checked this listing before" warning sign. It would mean logging which listings students look at.
- Timing: this is work for after judging. The demo and pitch stay as rehearsed until stage 1 lands.
- Warnings and the soft note follow the person through the ID card hash, as bans already do.
- A pass holder can add to their review until the window closes. Added a "deposit not returned" problem tag.
- Stage 1 keeps publishing "All good" reports from the address, so the demo doesn't lose its good counts before passes exist.
- Landlords verified before this change: the data is test-only and gets reseeded, so every real landlord verifies after it ships.

## 7. Verification
- **Per stage:** `pnpm --filter web test` (vitest; see the `chiriesigura-web-test-workers` skill if timeouts appear) and the extension tests.
- **Then end to end in mock mode:** run `scripts/seed.ts` and drive the flows on a 390 px phone viewport (the `chiriesigura-demo-run` and `chiriesigura-phone-pages` skills):
  - three reports from the address within minutes show the soft note, not 🟠, and the `/review` card shows **Burst**;
  - **Confirm warning** turns `d1` 🟠 in the extension;
  - from stage 2, the pass flow (create, claim, review) shows a good tag on the badge;
  - from stage 3, a no-pass report without evidence is refused, and an SMS lands in the mock outbox.
