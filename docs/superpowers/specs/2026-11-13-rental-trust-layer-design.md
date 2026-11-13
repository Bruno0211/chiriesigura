# Rental Trust Layer — Design

**Working name:** ChirieSigură (placeholder, team can rename)
**Event:** UniHack 8, Timișoara, 13–15 Nov 2026 · Track: **Connected Communities** (partner: **Nokia**, 3 Nokia judges)
**Deadline:** judging starts Sunday 15 Nov, 15:00. Pitch is 3 minutes.
**Date:** 2026-11-13

## 1. Intent and why

Students in Romania looking for rentals on OLX, Storia, imobiliare.ro and Facebook groups lose deposits to fake landlords: cloned listings, people who don't control the apartment, "send the deposit before the viewing". Existing Chrome extensions (RentalWatch, FlagMyListing, Idealista Trust Shield, RentSentry) only score listing text and price. Nobody verifies the **landlord** using telecom network data.

We add a trust layer on top of existing listing sites:
- A **landlord** proves who they are with Nokia Network as Code (CAMARA) APIs: their ID matches their phone number, their SIM hasn't been swapped recently, and their phone was near the apartment's address when they verified. They then prove they control their listings with a code.
- A **student** sees a badge on every listing page through a Chrome extension.
- **People who went to a viewing** can report what happened, but only if the network confirms they were actually there.

Why this wins: the core uses the track sponsor's own APIs for their intended use case (identity and anti-fraud), and it fixes a real, local problem students have.

## 2. Goals, non-goals, anti-goals

**Goals (must work live in the demo)**
1. Landlord verification flow on a phone: KYC Match → SIM Swap → Location Verification → register listing URL(s) → receive a code.
2. Extension shows the correct badge on a listing page (green, red, grey, amber, or "can't confirm"; rules in §6).
3. A copied listing that carries a verified listing's code shows **red "copied"**. This is the headline demo moment.
4. Viewing report flow: location-verified check-in at the address → pick a category → the badge reflects it.
5. Every Nokia call runs through one module that switches between `nokia` and `mock` mode (env var), so the demo runs no matter what network access we get.

**Non-goals (this weekend)**
- Image analysis or reverse image search. Price-outlier scoring at most as a one-line heuristic, only if time allows. It isn't new and it splits the story.
- Landlord right of reply or dispute flow (one pitch sentence only).
- Native mobile apps. The phone flows are mobile web pages.
- Supporting every site. OLX parser first; Storia and imobiliare.ro are a stretch goal.
- Accounts, passwords, login. The landlord is identified by the phone number checks, and students don't sign in.

**Anti-goals (would make it a failure even if it "works")**
- A green badge on a listing the verified person doesn't control. A badge that lends trust to a scammer is worse than no badge.
- Storing ID numbers or CNP. KYC Match only returns match/no match, and we keep only that result.
- Showing landlord contact details from our database. The extension only compares what is already on the page.
- Promising "the landlord was inside the apartment". Network location is cell-level. The wording is "verified near the address".

**Accepted gap (decided by the team):** a person using their own real ID and SIM can pass every check, stand near a building they don't control, post a fake listing with their code and get 🟢. We accept this for the weekend. Scammers rely on stolen identities and burner SIMs, and KYC Match + SIM Swap remove that cover, so whoever is left is scamming under their real name. Verified viewing reports catch them after a few visits. We say this openly in the pitch. Roadmap: compare the land-registry owner (ANCPI *extras de carte funciară*) with the KYC-matched name.

## 3. Constraints

- About 40 working hours, team of **4**. Everyone works through Claude Code, so prior language skills don't constrain the stack. Plan for 4 parallel tracks that touch separate folders: (1) extension, (2) phone pages `/verify` + `/viewing`, (3) API + DB + network module, (4) demo listing pages, seed data, pitch and slides. Storia and imobiliare.ro parsers stay in as stretch goals.
- Shared contract first: `packages/shared` types and the `/api/*` request/response shapes are agreed before the tracks split, so nobody waits on anyone.
- Nokia Network as Code access at the event is not yet confirmed. Ask the Nokia mentor at kickoff: (a) do we get API keys, (b) simulated devices or real Romanian SIMs, (c) the minimum Location Verification radius. Hence the mock mode.
- Number Verification and Location Verification need the request to come from the phone over **mobile data**, not Wi-Fi. The phone pages must say so.
- OLX and other sites: the extension reads only the page the student is already viewing. No server-side scraping is required for the demo.
- Romanian GDPR (Law 190/2018) restricts processing of the CNP. ID document data is passed through to KYC Match and never persisted.
- **API access and cost:** Nokia Network as Code has a free simulated network (default app + API key on signup) and a TypeScript SDK (`npm i network-as-code`). Live networks need Nokia's approval and are pay-per-use, so the demo runs on Nokia's simulator unless the mentor gives live access. Backup: Orange's free Network APIs Playground simulates SIM Swap, KYC Match, Number Verification and Location Verification, with 4–10 test numbers whose location and KYC data you set yourself. `lib/network` should make swapping providers a config change.
- **GDPR by design (pitch point, and required before any real launch):**
  - Legal basis is **consent**. Landlord and student each see a short consent screen naming the checks before any network call. A `/privacy` page lists what is stored and for how long.
  - Stored: check results (TRUE/PARTIAL, matched/not), timestamps, peppered phone hashes. Not stored: ID number, name, birthdate, the phone's coordinates. The apartment address is stored because the landlord publishes it anyway.
  - Viewing reports are personal data about the landlord, so post-hackathon they need a way to contest a report (GDPR rectification/objection). Out of scope this weekend, but the `/privacy` page names a contact.
  - The extension sends a page's visible phone number to the server only for comparison. It is never logged.
  - Demo uses simulator/test numbers only, so no real person's data is processed this weekend.

## 4. Approaches considered

| Option | Summary | Trade-off |
|---|---|---|
| **A. All TypeScript (chosen)** | Next.js app (API + mobile web pages) on Vercel, Postgres, WXT Chrome extension | Fastest to a working demo. Shared types between extension and API. Nokia has a TS SDK. One deploy target. Downside: one codebase to share among teammates. |
| B. .NET API + Kotlin Android app + React extension | One surface per person, contract-first | A native app looks polished, but there are three codebases to keep in sync over a weekend. Chosen against: the user wants the best stack, not a familiar one. |
| C. .NET API + React mobile web + extension | Two codebases | No advantage over A once .NET isn't a given. |

**Picked: A.** The user handed over the stack choice ("I want the best option"). A is the shortest path to a reliable live demo.

## 5. Architecture

```
┌──────────────────────┐        ┌────────────────────────────────────┐
│ Chrome extension     │  HTTPS │ Next.js app on Vercel              │
│ (WXT, TS, MV3)       │───────▶│  /api/*        JSON API            │
│  content script per  │        │  /verify/*     landlord phone flow │
│  site: reads listing │        │  /viewing/*    student phone flow  │
│  ID, code, phone     │        │  lib/network   Nokia | mock switch │──▶ Nokia Network as Code
│  → shows badge       │        │  lib/db        Postgres            │
└──────────────────────┘        └────────────────────────────────────┘
          │ "Report a viewing" shows a QR code ──▶ opens /viewing/... on the student's phone
```

- **Monorepo**: `apps/web` (Next.js App Router), `apps/extension` (WXT), `packages/shared` (types, listing-URL parsers, code format, badge rules).
- **Database**: Postgres provisioned through the Vercel Marketplace. The builder picks the provider at setup; ORM: Drizzle.
- **Nokia**: `lib/network.ts` exports `kycMatch`, `simSwapCheck`, `verifyLocation`, `verifyNumber`. `NETWORK_MODE=nokia|mock`. Mock mode returns configurable results so the demo can show both pass and fail cases.

## 6. Behaviour

### 6.1 Landlord verification (`/verify`, phone, mobile data)
1. Enter phone number, given name, family name, birthdate, ID document number (pass-through only), and the apartment's address. The address is geocoded to lat/lng.
2. **Number Verification**: confirms this phone really owns that number (silent, via the operator's redirect).
3. **KYC Match** on phone number + the identity fields. Required to pass: name, birthdate, ID document. Anything else is shown but not required.
4. **SIM Swap check**: fail if the SIM was swapped within the last **7 days** (builder may tune).
5. **"I'm at the apartment" button** → **Location Verification** for this phone against the address's lat/lng and the smallest radius the API allows. TRUE passes; PARTIAL passes with a "near" note; FALSE or UNKNOWN fails.
6. Paste one or more listing URLs. Each is parsed to `(site, siteListingId)`. Unparseable URLs are rejected with a message.
7. Show the code, e.g. `VC-7K3Q` (prefix + 4 characters without ambiguous ones like 0/O/1/I), plus the line to paste into each listing: `Proprietar verificat · ChirieSigură VC-7K3Q`.

If any check fails, show which one in plain words. No code is issued.

### 6.2 Extension badge
The content script extracts: `site`, `siteListingId` (from the URL), any `VC-XXXX` code in the page text, and the phone number if it's visible on the page. It calls `GET /api/check?site=&listingId=&code=&phone=`.

Rules, evaluated in order:
1. Code present, but site or listing ID unparseable → **⚪ Can't confirm**.
2. Code present and unknown → **🔴 Fake code**.
3. Code present and valid, but this `(site, listingId)` isn't registered to it → **🔴 Copied from a verified listing**.
4. Code valid and listing registered, but a visible phone number differs from the verified one → **🔴 Phone number doesn't match the verified landlord**.
5. Code valid and listing registered → **🟢 Verified landlord · near the address · date**, then apply report thresholds (§6.3): **🟠 Verified, but warnings from viewers**.
6. No code → **⚪ Not verified** + "Ask the landlord to verify" button (copies a short message with a link to `/verify`).

The badge also shows report counts when there are any: "4 verified viewings: 3 ✅ · 1 didn't show up".

### 6.3 Viewing reports (`/viewing/[verificationId]`, student's phone)
Opened from a QR code in the extension popup on a verified listing.
1. Student enters their phone number → **Number Verification**.
2. "I'm at the viewing" → **Location Verification** against the listing's verified address.
3. Pick one: ✅ All good · Landlord didn't show up · Apartment doesn't match photos/description · Asked for money before the viewing · Person at the viewing isn't the verified landlord.
   - If location verification fails, no report can be filed. **The student must be at the address for any report**, no-show included (being there is what makes a no-show credible).
4. One report per phone number per verification. Store a salted hash of the phone, never the number itself.

Report categories only, no free text.

**Thresholds (builder may tune):** 2+ "asked for money" or 3+ "didn't show up" or 3+ "not the verified landlord" → amber. Reports attach to the landlord, so they show on all of that landlord's listings.

## 7. Data model (sketch)

- `landlord` — id, phone_hash, number_verified_at, kyc_matched_at, sim_checked_at
- `verification` — id, landlord_id, code (unique), address_text, lat, lng, location_result (TRUE/PARTIAL), verified_at
- `listing` — id, verification_id, site, site_listing_id, url · unique(site, site_listing_id)
- `viewing_report` — id, verification_id, listing_id, reporter_phone_hash, location_result, category, created_at · unique(verification_id, reporter_phone_hash)

A listing URL already claimed by another verification is rejected at registration ("already registered — contact us"). Per §2 anti-goals, the code-in-listing step is what proves control. Registration does not fetch the listing (see §9).

## 8. Demo and pitch (3 minutes)

- 0:00–0:30 — The problem: a real-sounding student story, plus one Romanian number on rental scams if we can find a source.
- 0:30–2:20 — Live demo:
  1. Landlord on a phone verifies at "the apartment" (mock or real Nokia), gets `VC-7K3Q`.
  2. Laptop: the listing with the code → 🟢.
  3. Laptop: the scammer's copy of it → 🔴 Copied.
  4. A student's phone files a "didn't show up" report from the address → the badge updates.
- 2:20–3:00 — Why it works (four network signals combined, nothing stored), Nokia APIs used, the honest limit ("a scammer would have to use their real identity, and viewers catch them"), and what's next (ANCPI owner check, more sites, insurance/agency partners).

**Demo listings:** we must not post fake rental ads on real OLX. For the demo, serve two pages from the Next.js app at `/demo/listing/[id]`: a generic classifieds layout with **no OLX branding**, and its own parser in `packages/shared`. The OLX parser is still built and shown working on a real OLX page (it gives grey, since nobody there has a code).

## 9. Calls made in writing this up (check these)

- `NETWORK_MODE` can be set **per API** (e.g. real SIM Swap, mocked Number Verification) in case Nokia's sandbox only supports some APIs or only simulated devices.
- Phone numbers are stored as a **peppered hash** (server-side secret). The extension sends the raw page phone to `/api/check`, and the server hashes it before comparing.
- The content script reads the code **only from the listing's description element**, not the whole page, so codes in "similar listings" widgets don't cause a false 🔴 Copied.
- KYC Match `not_available` on a required field (name, birthdate, ID document) counts as **fail**. On other fields it's shown but ignored.
- Demo seed data includes earlier viewing reports, so the one live report in the demo visibly flips the badge to 🟠.

## 10. Left to the builder

- Exact Nokia SDK package and auth setup, and whether Number Verification in their sandbox needs a real device redirect or works with simulator numbers.
- The geocoding provider (any free one, or the demo addresses hardcoded).
- Extension UI details: badge placement per site, popup layout.
- Page design for `/verify` and `/viewing`. Mobile-first, Romanian UI text with English fallback is fine.
- Code alphabet and length, as long as it's short, unambiguous and unique.
- Exact threshold numbers and SIM swap window.
- Whether the backend also fetches a registered listing once to confirm the code is present (nice-to-have, skip if the site blocks it).
