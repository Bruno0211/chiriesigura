---
name: chiriesigura-phone-pages
description: Use when editing, measuring or committing the /verify or /viewing phone pages, including their 390 px layout and screenshots.
category: frontend
---

Phone pages use English UI. Romanian appears only in the product name "ChirieSigură" and the paste line `Proprietar verificat · ChirieSigură VC-XXXX`. This overrides the spec's Romanian-with-English-fallback default (§10).

## Pinned strings
The team plan's tests match these verbatim. Do not reword them:
- "Use mobile data, not Wi-Fi"
- "Switch to mobile data and try again"
- "We couldn't confirm this phone number"
- "This SIM was changed in the last 7 days" is the default window's text only. With `NEXT_PUBLIC_SIM_SWAP_WINDOW_HOURS=1` the server says "This SIM was changed in the last hour" and the consent line reads "in 1 hour". Keep the consent copy and the server check on one helper (`lib/sim-swap-window.ts`), so the screen never names a window the server does not check. Live wiring: `network-as-code-nokia`.
- "Already registered — contact us"
- "You need to be at the apartment to report"
- "You've already reported this viewing"
- The five report category labels. "All good" is a drawn check icon beside the words "All good", not the ✅ emoji. The user asked for this and the tests were updated with the copy.
- The state words "Passed", "Failed", "Checking" and "Waiting" are pinned too. Keep them verbatim in the DOM through any restyle, and confirm with the phone-pages test run (41/41 in the Tram Line build).
- When a restyle moves a pinned string into a different style (the viewing `reportLine` moved from mono to a caption), keep the exact text in the DOM. The team's tests match it.
- The under-review soft note on `/check` is pinned: "Viewers reported a problem · under review · never pay before you've seen the flat." Render it as `s.alert` with `data-tone="warn"` and `role="note"` beside the verdict. It is not the red alert, and the verdict word stays as it is.

## Direction and demo
- The locked direction is "Tram Line". The user picked it over the lead of the four-direction roll, and it replaces "The Confirmation Screen". Its contract is in `apps/web/.impeccable/surfaces/app-phone-layout-tsx.md`, section "Direction contract" (six-block form). Product context is `PRODUCT.md` at the repo root.
- Tram Line guardrails the user confirmed: not too playful, not a generic startup look (no purple gradients, glass or stock SaaS), not dark or techy, and keep the numbered step record (number, ID, SIM swap, location).
- A failure never removes a step from the record. Checks the person never reached stay on the route as dashed, unfilled stops: grey disc, ink-3 label, no state word, and an sr-only "Not checked". The route must not jump from the failed stop to the code. The four pinned state words stay as they are.
- Tram Line type: Atkinson Hyperlegible Next for the web and the extension badge (tabular figures for numbers). JetBrains Mono only for code cells, the "VC-" prefix, the paste line and quoted listing codes.
- The root `DESIGN.md` and `.impeccable/design.json` now describe the shipped Tram Line system, derived from its CSS and TSX. Remaining `impeccable detect` findings (small badge text kept below the type scale on purpose, one corner radius) are advisory.
- The phone is mirrored to a projector in the demo. The check record and the issued code must read across a room, so give the code the largest type on the done screen.
- After a `sim_swap` failure, "Start over" is the only action. Re-entering ID details cannot change a SIM-swap result, so drop the "Check my details again" retry for that failure kind only. The alert names the recovery with the window from `lib/sim-swap-window.ts`, for example "This SIM was changed in the last 7 days. You can verify once 7 days have passed since the change." Keep the retry for failure kinds where re-entering details can help.

## Signed-out gate
- A phone page that needs a student signed in shows one sign-in screen and no form. The server page passes `signedIn={await isSignedIn()}` to the client component, as `/check` does with `CheckForm signedIn={…}`.
- The sign-in link returns to the page: `/auth/login?returnTo=/check`, `/auth/login?returnTo=/viewing/{verificationId}`. Tests assert that href.
- Test the gate by rendering the client component with `signedIn={false}`: a link named `Sign in` shows, and the form fields and action buttons are absent. Don't try to jsdom-render the server page.

## Layout budget at 390×844
- The consent record must end above the pinned action bar. Its label is "We keep" under Tram Line (it replaced "Kept"). At 844 px tall the bar started at 730 px and the button at 748 px, so content must end at or before about 720 px.
- On the done screen, the "Copy the line" button must sit inside the viewport (it ended at 792 px of 844).
- Below 430 px width, drop the per-row time in compact record rows and keep the status icon.
- Report lines must not split a phrase at 390 px (for example "1 didn't show up" breaking across lines). Keep each phrase together with no-break spaces (U+00A0) inside it, not `nowrap` spans. The team's `/viewing` test uses `findByText(reportLine(counts))`, which reads only an element's own text, so spans break the match. Testing-library treats no-break spaces as ordinary spaces, so the existing assertions still pass.
- Measure with `getBoundingClientRect` on the real element, not by eye. Use the mobile emulation recipe in `mobile-web-layout-verification`.
- A phone-page task is not done until its 390×844 measurement is recorded. A subagent hand-back that says "no 390 px visual check" is DONE_WITH_CONCERNS, not DONE. Put the measurement step in the implementer brief.

## Design check
- After edits, run `impeccable detect --json "app/(phone)"` from `apps/web`.
- The code plate is a sign, not an input. Do not put an underline on code cells at all: a bottom rule makes the cells read as one-time-code entry fields. The Tram Line finish review removed the `.cell::after` underline rule. This supersedes the earlier inset-underline advice.
- Viewport and overflow checks follow `mobile-web-layout-verification`.
- To capture a state, prime sessionStorage from a same-origin static page such as `/privacy` (keys `cs.verify` and `cs.viewing.<verificationId>`), then navigate to the target route. Clear storage first so earlier states do not leak in.

## Local env and deploy
- Local dev needs `apps/web/.env.local` (gitignored, copied from `.env.example`). Without `PHONE_PEPPER` the number-check route `/api/nv/start` throws "PHONE_PEPPER is not set" and returns 500. Take the team value from the team chat and never commit it.
- `vercel env pull` writes `PHONE_PEPPER="[SENSITIVE]"`. Replace it with the real value; the seed refuses the placeholder.
- Pushing does not deploy: the GitHub repo is not connected to Vercel. Ship with `vercel deploy --prod` from the repo root. Vercel runs `NETWORK_MODE=mock` until `NAC_TOKEN` and the per-API `NETWORK_MODE_*=nokia` variables are set there and it is redeployed. Live Nokia wiring is in the `network-as-code-nokia` skill.
- Smoke-check a deploy by requesting `/verify`, `/privacy` and `/demo/listing/d1` and reading each page title.

## Git hygiene
- `.impeccable/.gitignore` must list `review/` and `hook.cache.json`, so screenshots stay out of commits.
- Stage only the folder you changed, for example `git add "apps/web/app/(phone)"`. Never stage `.playwright-mcp/`.
- Before committing or pushing, run `git fetch` and `git status -sb`. Teammates push to `origin/main` during the event, and `git pull --ff-only` before pushing keeps the branch linear. The review-fix commit `cb73e61` also swept in `.claude/sessions/*` notes and `.impeccable/mocks/` sketches, so check `git show --stat` first.
- Commit messages carry no Co-author lines.
