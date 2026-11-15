# Demo Listing Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the landlord edit the `d4` demo listing's description from their phone (Editează anunțul → paste the code line → Salvează), so that the laptop's extension shows 🟢 on reload.

**Architecture:**
- A new `demo_listing_edit` table holds edited descriptions.
- `PUT /api/demo/listings/[id]/description` validates and upserts. Only `d4` is editable.
- The prerendered demo page renders its description behind `Suspense`, preferring the saved edit. A client `EditListing` component edits it inline.
- `/verify`'s done screen links each accepted demo listing to `?edit=1`.
- The seed clears all edits.

**Tech Stack:** Next.js 16 App Router with `cacheComponents`, Drizzle + PGlite tests, React 19, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-15-demo-listing-edit-design.md`

## Global Constraints

- `EDITABLE_DEMO_LISTINGS = ['d4']`. Every other id gets 403 from the API and no edit button.
- Limits: at most 2000 characters and 20 non-empty lines. Lines are split on `\n` (strip `\r`), trimmed, and empty lines dropped. A body that ends up empty is a 400.
- The description must stay inside `<div data-testid="description">`, one `<p>` per line. The extension reads codes only from there.
- The demo portal copy is Romanian and the `/verify` copy is English. Use the verbatim strings in the task.
- Read `apps/web/AGENTS.md` and the relevant guide in `apps/web/node_modules/next/dist/docs/` (`cacheComponents`, `Suspense`, `connection`) before changing the page. The page must stay prerendered (`generateStaticParams`, an unknown id must stay a real 404). Only the description reads the database per request.
- Load the `chiriesigura-demo-listings-portal` skill (for /demo) and the `chiriesigura-phone-pages` skill (for /verify) before editing.
- **Commits:** no `Co-Authored-By` or `Signed-off-by` lines. Stage only your files. Keep CRLF.
- **Commands:**
  - focused tests: `pnpm --filter @cs/web exec vitest run <files>`;
  - full suite: `pnpm --filter @cs/web exec vitest run --maxWorkers=2`;
  - typecheck: `pnpm --filter @cs/web exec tsc --noEmit`;
  - migration: `pnpm --filter @cs/web db:generate`.

## Review Focus

1. **A pasted line with Windows line endings or stray spaces** is stored as clean lines (`\r` removed, trimmed). Then the extension reads `VC-XXXX` exactly.
2. **Someone sends PUT to `d1`** (or any non-editable id). They get 403 and `d1`'s stored description is unchanged.
3. **Text containing markup** (`<script>alert(1)</script>`) is stored as plain text and rendered as text, never as HTML.
4. **Over-limit text** gets 400, and the editor shows `Descrierea poate avea cel mult 2000 de caractere și 20 de rânduri.` with the textarea still filled.
5. **A database error while reading the edit** falls back to the built-in description and still renders the page. Never an error page.

---

### Task 1: Editable demo listing description

**Files:**
- Modify: `apps/web/lib/db/schema.ts`, adding `demoListingEdit` (table `demo_listing_edit`: `listingId text pk`, `description text not null` with lines joined by `\n`, `updatedAt timestamptz not null default now`)
- Create: `apps/web/drizzle/0006_*.sql` and its meta (generated)
- Create: `apps/web/lib/demo-edits.ts`
- Create: `apps/web/app/api/demo/listings/[id]/description/route.ts`
- Create: `apps/web/app/demo/EditListing.tsx` (client)
- Modify: `apps/web/app/demo/listing/[id]/page.tsx`, `apps/web/app/demo/demo.module.css`
- Modify: `apps/web/app/(phone)/verify/VerifyWizard.tsx` (done screen)
- Modify: `apps/web/scripts/seed.ts`
- Tests:
  - Create: `apps/web/lib/demo-edits.test.ts`, `apps/web/app/api/demo/listings/description.test.ts`, `apps/web/app/demo/edit-listing.test.tsx`
  - Modify: `apps/web/app/(phone)/verify/verify.test.tsx`, `apps/web/scripts/seed.test.ts`

**Interfaces (produces):**
- In `lib/demo-edits.ts`:
  - `export const EDITABLE_DEMO_LISTINGS: readonly string[] = ['d4']`
  - `export const DESCRIPTION_MAX_CHARS = 2000`, `export const DESCRIPTION_MAX_LINES = 20`
  - `export function normaliseDescription(text: string): string[] | null`. It returns null when the result is empty or over the limits.
  - `export async function savedDescription(db: Db, listingId: string): Promise<string[] | null>`
  - `export async function saveDescription(db: Db, listingId: string, lines: string[]): Promise<void>`. It upserts on `listingId`.
- Route `PUT /api/demo/listings/[id]/description`, body `{ description: string }`:
  - 404 `{ error: 'not_found' }` when the id isn't in `DEMO_LISTINGS`;
  - 403 `{ error: 'not_editable' }`;
  - 400 `{ error: 'bad_request' }` when the body isn't a string or `normaliseDescription` returns null;
  - 200 `{ description: string[] }`.
- `EditListing({ listingId: string; initial: string[] })` is a client component that renders the button, the inline editor and the live description.

- [ ] **Step 1: Write the failing tests**
  - **`demo-edits.test.ts`:**
    - `normaliseDescription('  a \r\n\r\n b  ')` returns `['a', 'b']`.
    - `''` and `' \n '` return null.
    - 2001 characters returns null.
    - 21 non-empty lines return null, and 20 lines pass.
    - `saveDescription` then `savedDescription` round-trips, and a second save overwrites.
    - `savedDescription` for an id with no edit returns null.
  - **`description.test.ts`** (route, with `makeTestDb`):
    - unknown id gives 404;
    - `d1` gives 403 and nothing is stored (Review Focus 2);
    - a non-string body, an empty string, and over-limit text each give 400;
    - `d4` with `'Line one\r\nProprietar verificat · ChirieSigură VC-7K3Q'` gives 200 `{ description: ['Line one', 'Proprietar verificat · ChirieSigură VC-7K3Q'] }`, and `savedDescription(db, 'd4')` returns the same (Review Focus 1);
    - `'<script>alert(1)</script>'` is stored verbatim as one line (Review Focus 3, storage half).
  - **`edit-listing.test.tsx`** (jsdom, `fetch` stubbed):
    - the description renders `initial` as one `<p>` per line inside `[data-testid="description"]`;
    - clicking **Editează anunțul** shows a textarea labelled **Descriere** prefilled with `initial.join('\n')`, plus the buttons **Salvează** and **Renunță**;
    - **Salvează** sends `PUT /api/demo/listings/d4/description` with `{ description }`. On 200 the editor closes, the returned lines show, and `Anunțul a fost actualizat.` appears;
    - on 400 it shows `Descrierea poate avea cel mult 2000 de caractere și 20 de rânduri.` and keeps the text (Review Focus 4);
    - on any other failure it shows `Nu am putut salva. Încearcă din nou.`;
    - **Renunță** restores the description;
    - with `?edit=1` in `window.location.search` the editor starts open;
    - `'<script>alert(1)</script>'` renders as text, with no `script` element (Review Focus 3, render half).
  - **`verify.test.tsx`:** on the done screen, an accepted `{ site: 'demo', listingId: 'd1' }` row has a link named **Open the listing to add the line** with href `/demo/listing/d1?edit=1` and `target="_blank"`. An OLX row has no such link.
  - **`seed.test.ts`:** after `saveDescription(db, 'd4', ['x'])` and reseeding, `savedDescription(db, 'd4')` returns null.
- [ ] **Step 2: Run them to verify they fail**
  - Run: `pnpm --filter @cs/web exec vitest run lib/demo-edits.test.ts app/api/demo app/demo "app/(phone)/verify" scripts/seed.test.ts`
  - Expected: FAIL (modules missing, no link, no table).
- [ ] **Step 3: Implement**
  - Schema, then `pnpm --filter @cs/web db:generate`. The migration must create only `demo_listing_edit`.
  - `lib/demo-edits.ts` and the route.
  - **The page:**
    - Replace the static description block with `<Suspense fallback={<EditListing listingId={id} initial={l.description} />}>`, wrapping an async server component. That component awaits `connection()`, reads `savedDescription`, and renders `<EditListing … initial={saved ?? l.description} />`.
    - For a non-editable listing, render the same description markup without the button.
    - On a database error, fall back to `l.description` (Review Focus 5).
  - **`/verify`:** add the link on accepted `demo` rows of the done screen.
  - **Seed:** `db.delete(demoListingEdit)`.
  - **Styles:** in `demo.module.css`, following the portal's existing button and input styles. Check that `d4` works at 390 px wide, because the landlord edits it on a phone.
- [ ] **Step 4: Run everything**
  - Run: `pnpm --filter @cs/web exec vitest run --maxWorkers=2 && pnpm --filter @cs/web exec tsc --noEmit`
  - Expected: all PASS and tsc clean.
  - Also run `pnpm --filter @cs/web exec eslint` on the files you touched: clean.
- [ ] **Step 5: Commit**

```bash
git add apps/web/lib apps/web/drizzle apps/web/app/api/demo apps/web/app/demo "apps/web/app/(phone)/verify" apps/web/scripts
git commit -m "feat(web): the landlord can edit the d4 demo listing to add the code line"
```
