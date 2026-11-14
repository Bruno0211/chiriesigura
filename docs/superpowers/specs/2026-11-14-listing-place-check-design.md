# Listing place check: design

Date: 2026-11-14 · Status: approved by Bruno (approach A + B), written up for planning

## 1. Why

A landlord who passed every check can still register **any** OLX or Storia link. The network confirmed his phone within 2 km of the address he typed, but nothing ties that address to where the listing says the flat is: our server can't read OLX pages (403), and Tin's 5 km registration check (`lib/listing-area.ts`) only knows our own demo listings.

The attack: Mihai verifies with his real ID at his own flat in Timișoara, then posts an OLX ad with photos of a flat in Cluj and his own number, and registers it. Today it shows 🟢 *Verified landlord · near the address*.

What already limits it: a registered listing can't be taken over (`already_registered`), the phone on the page must match, and his real ID means viewer reports lead to a lifetime ban. This design closes the "different city" part. A different flat in the **same** city stays open until an ownership check (ANCPI).

## 2. Goals, non-goals, anti-goals

**Goals**
- **A.** On OLX, Storia and our demo pages, the extension reads where the listing says the flat is, and the badge turns red when that is far from where the landlord verified.
- **B.** Everywhere (every site, `/check` on the phone), the green and amber badge says which city the landlord verified in, so a student can spot a listing in another city by eye.
- A seeded demo listing (d7) that shows A, for the Q&A.
- Storia gets the phone selector it is missing, so Storia badges also match the phone.

**Non-goals**
- imobiliare.ro and Facebook support in the extension.
- Proving the landlord owns the flat (ANCPI).
- Remote reports. A student who notices a mismatch online can't report it: reports stay "only from the address", the pitch's promise. A viewer who goes and finds a different flat can already report "doesn't match the listing" (`mismatch`).
- Changing the pitch's timed demo. d7 is for the Q&A only.

**Anti-goals** (failures even if it technically works)
- A badge turns red because data was missing or a lookup failed. Unknown never punishes.
- The badge or `/check` shows the landlord's street address. Only the city is shown.
- The live demo depends on Nominatim answering.

## 3. Approaches considered

- **A. The extension reads the place; the server compares.** Automatic, reuses the adapter pattern the phone match already uses. Breaks silently if a site changes its markup. **Picked.**
- **B. Show the verified city; the student compares.** Works on every site and on the phone, never breaks, relies on the student noticing. **Picked as the fallback alongside A.**
- **C. Ownership check (ANCPI).** The real fix; no access this weekend. Stays on the "Next" slide.

## 4. Design

### 4.1 What the extension reads (A)

`SiteAdapter` gains place selectors next to `phoneSelector`; `Extracted` gains the place.

| Site | Place text | Coordinates |
|---|---|---|
| OLX | The city line in the ad's sidebar, which reads e.g. "Timisoara" + "Timis" (city, county). It has no `data-testid` of its own; it sits inside `[data-testid="aside"]` next to the map. The builder pins the selector on a real ad. | none |
| Storia | The map link `a[href="#map"]`, e.g. "Zona Soarelui, Timisoara, Timis". | `coordinates.latitude/longitude` in the `#__NEXT_DATA__` script's JSON (seen on a real ad: `{"latitude":45.73587,"longitude":21.249695}`). Read the script's text; content scripts can't read page JS variables. |
| Demo | A new `data-testid="place"` element holding `area` (e.g. "Timișoara, Centru"). | none (the page shows text only, like OLX) |

Storia also gets a phone selector (builder finds it on a real ad, once revealed, the way OLX's `contact-phone` works).

The extension sends what it found with the existing check request: `place` (text) and, when known, `placeLat` / `placeLng`.

### 4.2 What the server decides (A)

In `GET /api/check`, only when a verification was found and its listing check reached the point where the place matters:

1. **Where the listing is:** coordinates from the page if sent; otherwise look up `place` text.
2. **Where the landlord verified:** `verification.lat/lng`, already stored (the typed address, network-confirmed within 2 km).
3. **Limit:** 5 km (`MAX_LISTING_DISTANCE_M`, the constant Tin's registration check uses) when the page gave coordinates; **15 km** when only a place name was looked up, because a city name geocodes to the city centre.
4. Over the limit → `listingFar = true`.

Unknown never punishes: no place, a lookup that fails or finds nothing, or no verification → `listingFar = false`.

**Place lookup:** a new function next to `geocode()` in `lib/geocode.ts`, Nominatim with `countrycodes=ro`, results remembered in memory per server instance (`shortcut: per-instance cache, move to a table if lookups get rate-limited`). Nominatim allows about one request per second; place names are few. A short timeout (about 2 s) so a slow lookup can't hold the badge. Demo place names ("Timișoara, Centru", "Cluj-Napoca, Centru", the others the demo pages use) resolve from a fixed table, like `DEMO_ADDRESSES`, so the demo never calls Nominatim.

### 4.3 The new badge status (A)

- `BadgeStatus` adds `red_far_away`. Label: **"Listing is far from where the landlord verified"**.
- `BadgeInput` adds `listingFar: boolean`.
- Order in `decideBadge`: fake code → banned → copied → phone mismatch → **far away** → amber → green. A ban still wins.
- Extension: tone `fail`; record rows `[code, PASSED('Code issued by ChirieSigură'), PASSED('Registered to this listing'), FAILED('Flat in the same area', 'Where this listing says the flat is, is far from where the landlord verified.')]` (a static message: the server doesn't send the place back); toolbar action like the other reds. `KNOWN` in `messages.ts` must list it (the type forces this).
- `/api/check` returns no `verificationId` for it, like the other reds.

### 4.4 The verified city (B)

- `verification` gains a nullable `city` text column, set once at verification time in `/api/verify/identity`. `geocode()` asks Nominatim for `addressdetails=1` and returns the city (`city`, else `town`, else `village`) along with the coordinates; the demo address returns "Timișoara".
- `badgeLabel` for green: "Verified landlord · near ‹city› · ‹date›" when the city is known; today's "near the address" text when it isn't (older rows).
- Amber's record shows the same city. `/check` shows the label the API returns, so it gets the city with no extra work.
- Only the city is ever shown; the street address stays server-side, as today.
- Existing verifications have no city and keep today's text. The seed sets the city for its demo verifications.

### 4.5 Demo (d7) and pitch

- **d7**, a new demo listing: a flat whose place line says **"Cluj-Napoca, Centru"**, carrying a real code and its landlord's own phone, so only the place is wrong.
- Seeded directly (Tin's registration check would refuse it, correctly): a separate landlord (e.g. Radu, `+40 700 000 011`, not one the mock fixtures use), verified at the demo apartment in Timișoara with city "Timișoara", code e.g. `VC-CLJ7`, with d7 registered to him. `seed:prod` resets it like the other demo rows.
- Expected badge on d7: 🔴 *Listing is far from where the landlord verified*.
- `docs/pitch.md` gets a short Q&A section with the answer and "open d7" as the proof. The timed script doesn't change.

## 5. Constraints

- English UI; Romanian only in place names and the paste line (project skill `chiriesigura-phone-pages`).
- Wording says "near", never "inside" (PRODUCT.md).
- Commits carry no Co-author lines.
- The extension's `KNOWN` record and every `Record<BadgeStatus, …>` must list the new status.

## 6. Calls made while writing this up (not discussed with Bruno)

- **5 km, not 3 km, when the page gives coordinates:** reuses `MAX_LISTING_DISTANCE_M`, so one "near" distance for both checks.
- **`CheckResponse` gains `city?: string`** for green and amber, so the extension's amber record can show it; the label carries it for green.
- **The extension sends the place on every check**, not only after the phone matched: simpler, and the server ignores it when no verification is found.
- **OLX's two lines join as "‹city›, ‹county›"** (e.g. "Timisoara, Timis") before lookup.
- **`verification.city` arrives in a new Drizzle migration**, nullable, no backfill.
- **Accepted risk:** on real OLX and Storia text-only pages the red badge depends on a live Nominatim lookup from Vercel. If Nominatim rate-limits Vercel's shared IPs, the check quietly stops firing there ("unknown never punishes"). The demo is unaffected (fixed table). Upgrade path: a lookup table in the database, or a paid geocoder.

## 7. Left to the builder

- The exact OLX and Storia selectors, confirmed on a real ad.
- How `place` / `placeLat` / `placeLng` travel (query params on the existing GET is the obvious fit).
- Test layout, following the existing tests (`badge.test.ts`, `check.test.ts`, extension `extract` tests, `seed.test.ts`).
