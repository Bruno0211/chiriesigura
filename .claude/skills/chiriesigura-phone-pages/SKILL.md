---
name: chiriesigura-phone-pages
description: Use when editing /verify or /viewing phone pages.
category: frontend
---

Phone pages use English UI. Romanian appears only in the product name "ChirieSigură" and the paste line `Proprietar verificat · ChirieSigură VC-XXXX`. This overrides the spec's Romanian-with-English-fallback default (§10).

## Pinned strings
The team plan's tests match these verbatim. Do not reword them:
- "Use mobile data, not Wi-Fi"
- "Switch to mobile data and try again"
- "We couldn't confirm this phone number"
- "This SIM was changed in the last 7 days"
- "Already registered — contact us"
- "You need to be at the apartment to report"
- "You've already reported this viewing"
- The five report category labels, including "✅ All good"

## Direction and demo
- The locked direction is "The Confirmation Screen" (bank 3-D Secure / SMS-code style). Its contract is in `apps/web/.impeccable/surfaces/app-phone-layout-tsx.md`, section "Direction contract". Product context is `PRODUCT.md` at the repo root.
- The phone is mirrored to a projector in the demo. The check record and the issued code must read across a room, so give the code the largest type on the done screen.

## Design check
- After edits, run `impeccable detect --json "app/(phone)"` from `apps/web`.
- A thick `border-bottom` on a rounded code cell was flagged. Use an inset `::after` underline instead, kept clear of the corners.
- Viewport and overflow checks follow `mobile-web-layout-verification`.

## Git hygiene
- `.impeccable/.gitignore` must list `review/` and `hook.cache.json`, so screenshots stay out of commits.
- Stage only the folder you changed, for example `git add "apps/web/app/(phone)"`. Never stage `.playwright-mcp/`.
- Commit messages carry no Co-author lines.
