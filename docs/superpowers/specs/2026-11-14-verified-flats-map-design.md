# Verified Flats Map: Design (short)

**Date:** 2026-11-14 · **Status:** approved by the user (Track E) on 2026-11-14 · **Builder:** a teammate (Bruno or Tin, to be agreed in the team chat), in parallel with the AI scan
**Builds on:** the main spec `2026-11-13-rental-trust-layer-design.md`; independent of the AI scan.

## Intent and why
- Show the "Connected Communities" theme on screen: a live map of Timișoara with every **verified flat**, where one click opens the listing.
- It also marks flats whose listing **was copied by a scammer**.
- Each check makes the map smarter. When the presenter opens the scammer's copy `d2` in demo step 3, `/api/check` records it, and `d1`'s pin gets a **"⚠ 1 copy"** tag.
- It gives landlords a reason to verify: their flat is on a map students browse.
- **Pitch:** the closing screen during "Why it works", about 10 seconds: *"Every verification and every copy we catch lands on a live map of Timișoara. Students see verified flats near them; one click opens the listing."* The pitch owner trims 10 s elsewhere.

## Goals
1. `/map` shows a full-screen map of Timișoara. The site root `/` redirects to `/map`, replacing the Next.js starter page.
2. Pins:
   - **green** = verified landlord;
   - **orange** = verified, but warnings from viewers (the existing `AMBER_THRESHOLDS`);
   - a **red "⚠ N copy" tag** when copies of that flat's listing were caught.
3. Clicking a pin opens a card:
   - photo, title, price (demo listings), or "Listing on OLX" (real listings);
   - the verbatim badge label (`badgeLabel`);
   - **"Open the listing →"**;
   - per caught copy: *"⚠ A copy of this listing was caught. Don't contact it or send money."* plus *"See the copy (to report it) →"*.
4. Pins sit **50–150 m away from the real address**, at a fixed offset per verification. The exact coordinates never leave the server.
5. The map refreshes its data every 15 s, so a copy caught during the demo appears without reloading.

## Non-goals (say "next steps" if asked)
- List view, layer switches, the AI layer, neighbourhood circles, search and filters.
- Copies with a fake or unknown code: there's no verified flat to attach them to.
- Showing listings that are only AI-flagged or unverified.

## Anti-goals
- Exact addresses, landlord names or phone numbers anywhere in the API or the page.
- A pin for anything that isn't a network-verified flat.
- Raw HTML from stored data. Listing URLs come from landlords, so they're untrusted. Build popups with DOM APIs and allow only `http:`/`https:` links.

## Constraints
- Next.js 16.4 (read `apps/web/node_modules/next/dist/docs/` first). `cacheComponents` is on, so data that must be fresh comes from the API at request time.
- **Map tiles:** use **OpenFreeMap** with **MapLibre GL JS** (`maplibre-gl`): no key, no signup, and production use is allowed (style `https://tiles.openfreemap.org/styles/positron`).
  - Don't use `tile.openstreetmap.org` (volunteer servers with a strict usage policy) or CARTO (now needs a key).
  - Attribution must stay visible.
- Prototype learning: the brainstorm mockup server sends `Referrer-Policy: no-referrer`, which breaks referrer-checked tile services. The real site doesn't have this problem.
- Feature freeze Sun 15 Nov 12:00. Commit per task with `git pull --rebase` first, no `Co-Authored-By` lines. Pushing to `main` deploys production. New migrations must be additive.

## Approaches (chosen in the visual mockups)
| | Layout | Decision |
|---|---|---|
| **A** | Full map + pop-up card | **Chosen**: the simplest to show and explain in 10 s |
| B | List + map (like Airbnb) | Cut: more to build and explain |
| C | Neighbourhood circles + AI layer | Cut: can't click through to a flat, and AI suspicion on a public map risks accusing honest landlords |

## How it works
- **Recording copies.**
  - New table `copy_sighting(id, verification_id → verification ON DELETE CASCADE, site, site_listing_id, url NULL, first_seen_at)`, `unique(verification_id, site, site_listing_id)`.
  - `/api/check` inserts a row (on conflict do nothing) whenever it answers `red_copied`.
  - It takes an optional `url` query parameter. The URL is stored only if it parses (`parseListingUrl`) to the same site and listing id. For `demo` listings without a `url`, it's built from `NEXT_PUBLIC_APP_URL`.
  - The extension adds the page URL to its `/api/check` request (`checkUrl`).
- **`GET /api/map`** returns `MapResponse` (shared contract):
  - The flats are verifications with `verified_at` set and at least one listing.
  - Status comes from `landlordReportCounts` + the shared amber rule.
  - Coordinates are approximate.
  - Demo listings get title, price and first photo from `DEMO_LISTINGS`.
  - Fields: copies, `Cache-Control: no-store`, CORS `*`.
- **Demo data.**
  - Add `d6`–`d10` to `DEMO_LISTINGS`: verified flats in Iosefin, Fabric, Complex Studențesc, Elisabetin and Circumvalațiunii. Each has its own code in the paste line and its own landlord phone.
  - The seed creates their landlords, verifications (coordinates in `DEMO_ADDRESSES`) and listings, plus 3 `no_show` reports on the Fabric flat so it shows orange.
  - The seed **deletes all `copy_sighting` rows**, so the live "copy caught" moment happens fresh in every rehearsal.
  - `d4` appears on the map once the landlord registers it live in demo step 1, which is a second live moment.
- **Page.** `app/map/page.tsx` renders a client component that loads `maplibre-gl` in an effect, fetches `/api/map`, draws HTML markers and popups, and polls every 15 s.
  - Header: "ChirieSigură · Verified flats · Timișoara".
  - Legend bottom left: Verified landlord / Verified, warnings from viewers / ⚠ A copy of the listing was caught.
  - Colours from the existing tokens: green `#0f7a4a`, orange `#b26a00`, red `#b3261e`, indigo bar `#2e2a8f`.

## Decisions and who made them
| Decision | By |
|---|---|
| Build the map; verified flats + caught copies; each pin opens the listing | User |
| Layout A only; cut list, layers, AI layer; 10-second closing slot | User agreed to Claude's recommendation |
| Copies attached to the original flat's pin, recorded by `/api/check` | Claude's call, user agreed |
| Pins 50–150 m away from the real address | Claude's call, user agreed |
| OpenFreeMap + MapLibre for tiles; `/` redirects to `/map`; 15 s refresh; `d6`–`d10` demo flats | Claude's call |

## Left to the builder
- Exact demo flat texts, addresses and photos (reuse photo ids already in `demo-listings.ts`). Pin offset algorithm (deterministic from the verification id). Popup styling within the colours above. How the client component is wired under Next 16.
