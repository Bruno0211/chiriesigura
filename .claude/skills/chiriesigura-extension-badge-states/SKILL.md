---
name: chiriesigura-extension-badge-states
description: Use when editing badge icons or states in the extension.
category: frontend
---

Give every badge state its own mark. An unverified listing (`none`) gets a drawn ring with a dash. The dotted `pending` ring is reserved for the busy "Checking this listing…" spinner, so a non-busy state never shares it.

- Map `none` separately in both the MARK table and the WORD_ICON table of `apps/extension/lib/badge-ui.ts`, and draw its icon in `apps/extension/lib/icons.ts`.
- Copy in `badge-ui.ts` is pinned by the team plan. Icon changes do not change copy.
- The user approved replacing the colour emoji in the report line ("3 verified viewings: 3 ✅") with a drawn check. Draw it from the extension icon family in `apps/extension/lib/icons.ts`, `aria-hidden`, beside the visible word "all good". Keep the same change on the /viewing "All good" option. No colour emoji should remain in shipped UI; report category values stored in the DB stay unchanged, only display text moves.
- The badge has two statuses only, green (verified) and red (banned). The amber status and its `.status[data-tone='warn']` CSS rule are retired. When a state is removed, sweep: its CSS selector in `badge.css`, the DESIGN.md lines that still describe it, `isCheckResponse` tests that accept it, and unused imports. Keep the `--warn` and `--warn-bg` tokens, because `.caution` uses them.
- The under-review note is a caution, not the red "don't pay" alert (`dontPay`). Render it after `landlordChecks` as the `.alert` base class with a `.caution` modifier, using the existing `--warn` and `--warn-bg` tokens in `badge.css`. Keep the status label unchanged. Copy is pinned: "Viewers reported a problem · under review · never pay before you've seen the flat."
