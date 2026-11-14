# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Landlords renting rooms/apartments in Romania (first Timișoara) on OLX, Storia, imobiliare.ro, Facebook groups. Asked by a prospective tenant to verify, they do a one-time check on their own phone, at the apartment, on mobile data.
- Students hunting for rentals: browse on a laptop with the Chrome extension; after a viewing, report it on their phone at the address.
- UniHack 8 judges (Connected Communities track, partner Nokia) watch both phone flows mirrored to a projector in a 3-minute pitch.

## Product Purpose

Stop deposit fraud by fake landlords (cloned listings, people who don't control the flat, "deposit before the viewing"). Landlords prove identity and presence with mobile-network checks and get a short code to paste into their listings; the extension badges every listing; location-verified viewing reports catch verified people who still misbehave. Success: a student can tell at a glance whether a listing is verified, copied, or reported.

## Positioning

The mobile network vouches for the landlord, not an uploaded document or a text score: the operator confirms this phone owns the number (Number Verification), the ID matches the SIM owner (KYC Match), the SIM wasn't swapped in 7 days (SIM Swap), and the phone is near the apartment (Location Verification), through Nokia Network as Code (CAMARA). Existing extensions (RentalWatch, FlagMyListing, Idealista Trust Shield, RentSentry) only score listing text and price.

## Operating Context

- Phone pages run in the mobile browser over mobile data; Number and Location Verification fail on Wi-Fi.
- Landlord: at the apartment door or stairwell, one hand, about 3 minutes, inside a 15-minute number-verification session. Arrives from the "Ask the landlord to verify" message the extension copies.
- Student: at the door of a viewing, possibly after a no-show. Arrives from a QR code in the extension popup (`/viewing/[verificationId]`).
- Landlord pastes `Proprietar verificat · ChirieSigură VC-XXXX` into each listing's description.
- Demo runs live against Nokia's simulator: landlord +99999992002 (test identity Zoltan Eszter), student +99999992000. Mock mode accepts the same numbers; its fixtures +40700000001…6 cover the failure cases in tests.

## Capabilities and Constraints

- Location: TRUE passes, PARTIAL passes as "near", FALSE/UNKNOWN fails. KYC required fields: name, birthdate, ID document. SIM swap window 168 h by default (NEXT_PUBLIC_SIM_SWAP_WINDOW_HOURS; 1 h against Nokia's simulator, where no test number is clean for 7 days).
- A consent screen naming the checks comes before any network call.
- Never stored: ID document number, name, birthdate, phone coordinates, raw phone numbers. Stored: check results, timestamps, peppered phone hashes, apartment address, listing URLs, report categories.
- Wording: "near the address", never "inside the apartment". Reports are categories only, one per phone per verification, and only from the address.
- UI language English (matches API messages and tests); Romanian names with diacritics (ă â î ș ț) must render.
- Undecided: final product name (ChirieSigură is a placeholder); /privacy contact email.

## Brand Commitments

Working name ChirieSigură. No logo, colours or type exist yet. Badge copy is fixed verbatim (spec §6.2).

## Evidence on Hand

No users, testimonials or statistics yet; do not invent any. Demo fixtures: apps/web/lib/network/mock-fixtures.ts.

## Product Principles

1. A badge that lends trust to a scammer is worse than no badge.
2. Precision is the security signal: say what was checked, by whom, and what was kept.
3. Every failure names the check that failed, in plain words.
4. Personal data passes through; the UI never echoes ID data back.
5. State the limits honestly (cell-level location, the accepted gap).

## Accessibility & Inclusion

WCAG 2.2 AA. One-handed on a mid-range phone outdoors; legible when mirrored to a projector.
