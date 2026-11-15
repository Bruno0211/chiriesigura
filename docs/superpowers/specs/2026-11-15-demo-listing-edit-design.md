# Edit a demo listing from the landlord's phone: design

**Date:** 2026-11-15 · **Size:** small change · **Status:** approved by the team ("implement your pick")

## Why
- In pitch beat 1, Zoltan verifies and registers `d4`, and gets his code line. But the demo page can't change, so the audience never sees the code go into the listing and the badge turn 🟢. The story jumps to `d1`, "a listing he verified earlier".
- The team wants to close the loop live on one flat: verify, copy the line, edit the listing, reload, 🟢. That is exactly what a landlord does on OLX.

## Approaches
1. **Edit on the phone, saved on the server.** Picked.
   - An OLX-style **Editează anunțul** button on the demo listing, a description textarea, and **Salvează**.
   - The laptop reloads and sees the new text.
   - The seed clears every edit, so rehearsals start the same.
2. **The code appears automatically** once `d4` is registered. Rejected: the audience never sees the landlord add it.
3. **Edit on the laptop, saved in that browser only.** Rejected: the presenter types the code instead of the landlord, and a reseed can't reset it.

## Design
- **Who can edit:** demo listings in `EDITABLE_DEMO_LISTINGS = ['d4']`. No sign-in, because it's a demo page; the portal banner already says the listings aren't real. The pitch's fixed listings (`d1`, `d2`, `d5`, `d7`) can't be edited, so nobody can vandalise them during judging.
- **Edit UI**, on the demo listing page, only for editable listings:
  - A secondary **Editează anunțul** button near the title or summary actions.
  - It opens an inline editor: a textarea labelled **Descriere**, prefilled with the current description (one paragraph per line), plus **Salvează** and **Renunță**.
  - Saving shows the new description right away.
  - Opening the page with `?edit=1` opens the editor directly.
- **API:** `PUT /api/demo/listings/[id]/description` with body `{ description: string }`.
  - **Answers:** 404 for an unknown id; 403 for a listing that isn't editable; 400 if the body isn't a string, is empty after trimming, is over 2000 characters, or has more than 20 non-empty lines; otherwise 200 `{ description: string[] }`.
  - **Normalising:** the text is split on newlines, each line trimmed, and empty lines dropped.
  - **Storage:** a new table `demo_listing_edit` (`listing_id` text primary key, `description` text, `updated_at` timestamptz), written with an upsert.
- **Rendering:** the description shows the saved edit when one exists, otherwise the built-in text. It stays inside the element the extension reads (`[data-testid="description"]`).
  - The page stays prerendered.
  - Only the description is per request: behind `Suspense`, with the built-in text as the fallback. Read `node_modules/next/dist/docs/` for Next 16's `cacheComponents` rules first.
- **`/verify` done screen:** each accepted listing on the `demo` site links to it. Label **Deschide anunțul**, URL `/demo/listing/{id}?edit=1`, opening in a new tab so the code plate stays. The landlord copies the line, taps the link, pastes and saves.
- **Seed:** deletes every `demo_listing_edit` row.
- **The pitch text isn't changed in this branch.** `docs/pitch.md` has uncommitted edits in the main checkout, so the new beat goes to the team in chat.

## Non-goals
- Editing the title, price, photos or phone.
- Editing real OLX listings.
- Any ownership check on the demo edit.

## Calls made (for the team to check)
- Only `d4` is editable.
- The description is capped at 2000 characters and 20 lines.
- The `?edit=1` shortcut, and the link from `/verify`.
