# @cs/extension — ChirieSigură listing badge

Chrome MV3 extension (WXT). On a listing page it reads the listing URL, the `VC-XXXX` code in the
listing's own description and the phone number if one is shown, asks the web app's `GET /api/check`
(through the background worker), and pins the badge to the top right of the page.

- **Sites:** OLX (`*.olx.ro`), Storia (stretch; selectors not yet checked against a live page), and the
  app's demo listings at `<app host>/demo/listing/*` (any port).
- **Badge:** collapsed status card; click it for the panel: the listing's own record (which check failed),
  the landlord's four operator checks, viewing reports, a QR code to `/viewing/<id>?code=VC-XXXX`, or
  "Ask the landlord to verify". The toolbar popup shows the same panel for the active tab.
- **Design:** the phone pages' world (`apps/web/app/(phone)/phone.module.css`): same tokens, Public Sans +
  JetBrains Mono (bundled in `public/fonts`, SIL OFL), same stroke icons. Icon sources: `assets/icon*.svg`.

## Run

```sh
pnpm --filter @cs/extension test     # vitest + jsdom
pnpm --filter @cs/extension compile  # tsc
pnpm dev:ext                         # dev build against http://localhost:3000, opens Chrome
```

## Build for the demo

`WXT_APP_URL` is read at build time (shell, or `apps/extension/.env.local`):

```sh
WXT_APP_URL=https://<prod-url> pnpm --filter @cs/extension build
```

Then load `apps/extension/.output/chrome-mv3` unpacked (`chrome://extensions` → Developer mode →
Load unpacked).

## Fixtures

`test/fixtures/demo-listing.html` follows Task 13's markup contract (`data-testid` description / phone /
similar). Replace it with the saved output of `/demo/listing/d1` once that page ships.
`test/fixtures/olx-listing.html` is hand-written from OLX's markup (olx.ro refuses automated fetches):
save a real listing with Ctrl+S, trim it, and re-run the tests to confirm the selectors.
