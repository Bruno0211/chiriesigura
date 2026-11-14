# Listing area check: design

Date: 2026-11-14. Status: approved.

## Why

A landlord could pass the location check at one address and then register a listing for a flat somewhere else. The location check itself never uses the phone's GPS: the server asks Nokia Location Verification where the SIM is, so a fake-GPS app doesn't help. The gap was that nothing tied the listing to the address where the network located the landlord.

## Goals

- At registration, refuse a listing whose location we know and which is far from the address where the network located the landlord.
- Tell the landlord why, in plain words.

## Non-goals

- Flat-level precision. The limit is town-level (5 km).
- Reading OLX or Storia listing locations on the server. OLX answers server-side page fetches with HTTP 403 (bot protection), and we don't work around it.
- Changing the location pass rule (radius, PARTIAL, `maxAge`) or the mock/live network mode.

## Approaches

- **A. At registration (chosen).** `/api/verify/listings` looks up the listing's coordinates and refuses it with `far_from_address` when it is more than 5 km away. Server-only, and the landlord gets immediate feedback. It misses a listing whose location is edited later.
- **B. At display.** The extension reads the listing's area and the badge turns red when it's far away, like the phone-number match. It catches later edits and covers OLX and Storia, but it rewrites the same extension files as the unmerged `feat/ai-scan` branch and needs a geocode on every check. Planned follow-up once `feat/ai-scan` is merged.

## Design

- `DemoListing` gets `coords`. A new demo listing `d6` in Lugoj, about 53 km from the demo address, shows the refusal.
- `apps/web/lib/listing-area.ts`: `distanceM` (haversine), `MAX_LISTING_DISTANCE_M = 5000`, `listingCoords` (demo listings only, own-property lookup, because the id comes from a pasted URL) and `listingTooFar`.
- The listings route refuses a too-far listing with reason `far_from_address`. If nothing in the submission is registered, the location pass is given back, as it is for typos.
- Listings without known coordinates (OLX, Storia, unknown demo ids) are not refused. This is the known gap that approach B closes.

## Nokia location

Nokia's simulator answers per test number and ignores the area (`+99999991001` is TRUE in both Timișoara and Budapest), and real numbers return 404 `IDENTIFIER_NOT_FOUND`. The adapter is covered by tests. Later the same day the team chose to run production fully live against the simulator (`docs/checkpoints.md`, "Going live on Nokia"), so the 5 km area check is what ties a listing to a place: the simulator's location answer doesn't.
