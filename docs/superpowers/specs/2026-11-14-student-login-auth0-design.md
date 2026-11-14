# Student sign-in with Auth0: design

Date: 2026-11-14 · Size: small change

## Why

- The hackathon's Auth0 sponsor prize asks for an Auth0 integration.
- It lays the groundwork for the paid student tier: a one-time €2.99 payment, mentioned in the pitch but not built yet. Landlords stay free.

## What changes for students

- Students must be signed in, through Auth0 (Google as the sign-in option), before the extension shows any badge.
- When a signed-out student opens a listing, the badge shows **"Sign in to check listings"**. It has a **Sign in** button that opens `<app>/auth/login` in a new tab, and a **Try again** button that runs the check again once they've signed in.
- The site gets a sign-out link.
- **A new `/check` page on the site** is for when the extension isn't available (on a phone, or on a laptop without the extension):
  - The student pastes the listing URL and its `VC-XXXX` code. They can also add the phone number shown on the listing.
  - Signed out, the page shows the same "Sign in to check listings" button.
  - Signed in, it shows the verdict, using the same wording and states as the extension badge.
  - It's also the pitch backup if the extension fails on stage.

## Goals

- Signing in and out on the web app, using Auth0's official Next.js SDK (`@auth0/nextjs-auth0`). It adds `/auth/login`, `/auth/callback` and `/auth/logout`, and keeps the session in a cookie.
- `GET /api/check` answers only signed-in students. Anyone else gets `401 {"error":"signed_out"}`.
- The extension's background worker sends the site's session cookie with each check (`credentials: 'include'`). A 401 response becomes a new signed-out reply, and the badge and popup show the sign-in state for it.
- `/check` is a phone page in the `(phone)` route group, using the same design as `/verify` (see the `chiriesigura-phone-pages` skill).
  - It turns the pasted URL into a site and listing ID with the existing `parseListingUrl` from `@cs/shared`, and then calls `GET /api/check`, the same endpoint the extension uses.
  - The page is on the same site as the API, so the session cookie is sent without any cookie risk.
  - A URL from a site we don't support gets the existing "Can't confirm" state. A missing or malformed code gets "Not verified", just like the badge.
  - The page shows the verdict only. It has no viewing-report QR code, since the student is likely already on their phone.
- The `/privacy` page gets one line saying that Auth0 keeps the student's sign-in details (email and name), and that ChirieSigură doesn't.

## Non-goals (this round)

- Payment, and any student table in our database. Auth0 holds the users. The payment round will add a table keyed by Auth0's user ID (`sub`).
- Landlords moving to a new number.
- Having the server fetch the listing page itself. OLX blocks automated fetches, so the student pastes the code.
- Any change for landlords. They still sign in with their phone number through Number Verification. `/verify`, `/viewing` and `/api/verify/*` stay as they are.

## Anti-goals

- No signed-out student ever sees a verdict, and no student sees one from cache or a guess. "Signed out" must never look like a grey or "couldn't check" verdict.
- No ID or phone data goes to Auth0.

## Approaches considered

- **A (picked): sign in on the website, and the extension borrows its cookie.** There is one login, little extension code, and the future manual check page can use the same login. Risk: Chrome might not attach the site's cookie to the extension's background requests.
- **B: the extension signs in to Auth0 itself** (`chrome.identity` popup and a Bearer token checked against Auth0). It has no cookie risk, but it needs token handling, an Auth0 API to be set up, and two separate logins. This is the fallback if A's cookie test fails.
- Writing the Google OAuth flow by hand was dropped: the sponsor prize needs Auth0.

## Build order

1. **Cookie test first.** Add sign-in to the web app, then load a built extension and confirm that a signed-in session reaches `/api/check` from the background worker. If it doesn't, stop and switch to B.
2. Make `/api/check` require sign-in, add the extension's signed-out state, the sign-out link and the privacy line.
3. Add the `/check` page.
4. Tests:
   - `/api/check` returns 401 with no session.
   - `fetchCheck` turns a 401 into the signed-out reply, and the badge shows the sign-in state for it.
   - `/check` shows the sign-in button when signed out, and a verdict for a pasted demo listing when signed in.

## Setup you do (accounts are yours to create)

- Create an Auth0 tenant and a **Regular Web Application**, and turn on the Google social connection.
- Allowed Callback URLs: `http://localhost:3000/auth/callback` and `https://chiriesigura.vercel.app/auth/callback`. Allowed Logout URLs: the two site origins.
- Environment variables, in `apps/web/.env.local` and in Vercel: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` (a random 32-byte hex string), and `APP_BASE_URL`.

## Pitch impact

- Add to the "Before you go on stage" checklist: sign in on the laptop's Chrome before the demo.
- The demo listings need sign-in too, just like real ones.

## Left to the builder

- Read the Next.js 16 docs in `node_modules/next/dist/docs/` for `proxy.ts`. The Auth0 SDK mounts its routes there, and the file must not affect the existing `/api/*` routes.
- How the signed-out reply fits into `CheckReply` and `renderState`, kept consistent with the existing "checking" and "unavailable" states.
