# Student Sign-in with Auth0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students must sign in through Auth0 before `/api/check` answers. The extension shows a sign-in state when they're signed out, and a new `/check` phone page lets them check a listing by pasting its URL and code.

**Architecture:**
- `@auth0/nextjs-auth0` runs in the web app's `proxy.ts`. It mounts `/auth/*` and keeps the session in an encrypted `__session` cookie.
- `/api/check` asks one helper, `isSignedIn()`, and returns 401 if the student is signed out.
- The extension's background worker sends the site's cookie (`credentials: 'include'`) and turns a 401 into a signed-out reply. The badge and popup render a new `signed_out` state for it.
- `/check` is a client page in the `(phone)` group that calls the same `/api/check`.

**Tech Stack:** Next.js 16.4 (App Router, `proxy.ts`), `@auth0/nextjs-auth0` (latest v4), Vitest + Testing Library, WXT (Chrome MV3).

**Spec:** `docs/superpowers/specs/2026-11-14-student-login-auth0-design.md`

## Global Constraints

- UI copy is English. The signed-out label is exactly **"Sign in to check listings"**.
- Landlord flows don't change: `/verify`, `/viewing/*`, `/api/verify/*`, `/api/nv/*`, `/api/viewing/*` stay reachable without Auth0.
- A signed-out student never sees a verdict. "Signed out" is never shown as a grey or "Couldn't check" verdict.
- Nothing about the student is stored in our database. No ID or phone data goes to Auth0.
- Env vars: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`, `APP_BASE_URL`.
- Read `node_modules/next/dist/docs/` for `proxy.ts` before writing it (per `apps/web/AGENTS.md`). Use the `chiriesigura-phone-pages` skill for `/check`.
- Commit messages carry no Co-author lines (`chiriesigura-phone-pages` skill). Stage only the files each task names.

## Review Focus

1. **The session expires while `/check` is open.** The page rendered as signed in, but `/api/check` now returns 401. The page must switch to the sign-in state, not show an error or an empty verdict. Covered by a test in Task 4.
2. **`proxy.ts` stops the landlord flow on a phone with no Auth0 session.** `/verify` and `/api/nv/start` must still respond as before. Covered by a manual check in Task 1, step 7.
3. **The extension popup on a signed-out tab** must show the sign-in state, not "Couldn't check this listing". Covered by the popup routing in Task 3 and the watcher test there.
4. **Pasting an unsupported or garbage URL into `/check`** must give "Can't confirm" from the server, never a client crash. Covered by a test in Task 4.
5. **Tests that call `GET /api/check` directly** (`check.test.ts`, `scripts/seed.test.ts`) must mock the session helper, or they'll all start failing on 401. Covered in Task 1.

---

### Task 1: Auth0 in the web app, and `/api/check` requires sign-in

**Files:**
- Create: `apps/web/lib/auth0.ts`
- Create: `apps/web/proxy.ts`
- Modify: `apps/web/app/api/check/route.ts` (the top of `GET`)
- Modify: `apps/web/app/api/check/check.test.ts`, `apps/web/scripts/seed.test.ts` (mock the helper)
- Modify: `apps/web/app/(phone)/privacy/page.tsx` (one `<li>` in "Never kept")
- Modify: `docs/pitch.md` ("Before you go on stage"), `docs/checkpoints.md` ("Env on Vercel" line)
- Modify: `apps/web/package.json` (dependency)

**Interfaces:**
- Produces:
  - `auth0: Auth0Client`, from `@/lib/auth0`.
  - `isSignedIn(): Promise<boolean>`, from `@/lib/auth0`. It is `!!(await auth0.getSession())`.
  - `GET /api/check` returns `401 {"error":"signed_out"}` with the existing `CORS` headers when the student is signed out.
  - Routes `/auth/login`, `/auth/logout` and `/auth/callback`. `/auth/login` accepts `?returnTo=`.

- [ ] **Step 1: Install the SDK.** Run `pnpm --filter @cs/web add @auth0/nextjs-auth0`. Expected: it installs, with no peer-dependency error for `next@16.4.6`. If the peer range rejects Next 16, stop and report back.
- [ ] **Step 2: Write the failing test** in `check.test.ts`. At the top, add `vi.mock('@/lib/auth0', () => ({ isSignedIn: vi.fn(async () => true) }))`. Then add:

```ts
it('refuses a signed-out student, with CORS headers', async () => {
  vi.mocked(isSignedIn).mockResolvedValueOnce(false);
  const res = await GET(new Request('http://localhost:3000/api/check?site=demo&listingId=d1&code=VC-7K3Q'));
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: 'signed_out' });
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
});
```

  Add the same `vi.mock` (always `true`) to `scripts/seed.test.ts`.
- [ ] **Step 3: Run it.** `pnpm --filter @cs/web test app/api/check`. Expected: FAIL, because `@/lib/auth0` can't be resolved.
- [ ] **Step 4: Implement.**
  - `lib/auth0.ts`: `export const auth0 = new Auth0Client()`, plus `isSignedIn`.
  - `proxy.ts`: `export async function proxy(request: NextRequest) { return auth0.middleware(request); }`. Use the static-file-excluding `matcher` from the SDK README.
  - In `route.ts`: `if (!(await isSignedIn())) return Response.json({ error: 'signed_out' }, { status: 401, headers: CORS });`.
- [ ] **Step 5: Run all web tests.** `pnpm --filter @cs/web test`. Expected: everything passes, including `seed.test.ts`.
- [ ] **Step 6: Docs and copy.**
  - Privacy page, a new `<li>` in "Never kept": **"Students' email and name.** Auth0, our sign-in provider, keeps your sign-in. ChirieSigură only learns that you are signed in."
  - `pitch.md`, a step before step 2: "Laptop Chrome: sign in at `https://chiriesigura.vercel.app/auth/login` (the extension shows no badges until you do)."
  - `checkpoints.md`: append the five Auth0 env vars to the "Env on Vercel" line.
- [ ] **Step 7: Manual check.** This needs the user's Auth0 values in `apps/web/.env.local`. Run `pnpm --filter @cs/web dev`.
  - `/auth/login` reaches Auth0's sign-in page, and it offers Google.
  - After signing in, `/api/check?site=demo&listingId=d1&code=VC-7K3Q` returns JSON with a `status`. In a private window it returns 401.
  - `/verify` and `/privacy` render with no session.
- [ ] **Step 8: Commit.**

```bash
git add apps/web/lib/auth0.ts apps/web/proxy.ts apps/web/app/api/check apps/web/scripts/seed.test.ts "apps/web/app/(phone)/privacy/page.tsx" apps/web/package.json pnpm-lock.yaml docs/pitch.md docs/checkpoints.md
git commit -m "feat(web): require Auth0 sign-in for /api/check"
```

### Task 2: Cookie test. Does the extension's background worker carry the session? (GATE)

**Files:**
- Modify: `apps/extension/lib/check.ts` (the fetch options)
- Test: `apps/extension/lib/check.test.ts`

**Interfaces:**
- Consumes: `GET /api/check` behind sign-in (Task 1).
- Produces: `fetchCheck` sends `credentials: 'include'`.

- [ ] **Step 1: Write the failing test.** In `check.test.ts`, in the first test, assert `expect(f.mock.calls[0]![1]).toMatchObject({ credentials: 'include' })`.
- [ ] **Step 2: Run it.** `pnpm --filter @cs/extension test lib/check`. Expected: FAIL.
- [ ] **Step 3: Implement.** Add `credentials: 'include'` to the options in `fetchCheck`.
- [ ] **Step 4: Run it.** Same command. Expected: PASS.
- [ ] **Step 5: Manual test on a real build.**
  - Keep the dev server from Task 1 running and stay signed in.
  - Run `pnpm dev:ext`. Open `http://localhost:3000/demo/listing/d1`.
  - **Pass:** the badge shows a verdict (🟢). In the service worker's DevTools Network tab, the `/api/check` request carries a `Cookie: __session=…` header.
  - **Fail:** the request has no `__session` cookie, or it returns 401 while the site tab is signed in. In that case, **stop**, report back, and don't continue to Task 3. The spec switches to approach B (the extension signs in itself), and that needs a new plan.
- [ ] **Step 6: Commit.**

```bash
git add apps/extension/lib/check.ts apps/extension/lib/check.test.ts
git commit -m "feat(extension): send the site's session with checks"
```

### Task 3: The extension's signed-out state

**Files:**
- Modify: `apps/extension/lib/messages.ts` (`CheckReply`)
- Modify: `apps/extension/lib/check.ts` (the 401 mapping)
- Modify: `apps/extension/lib/badge-ui.ts` (`renderState`)
- Modify: `apps/extension/lib/watcher.ts` (the `paint` routing)
- Modify: `apps/extension/entrypoints/popup/main.ts` (the routing)
- Modify: `apps/extension/lib/urls.ts` (add `signInUrl`)
- Test: `check.test.ts`, `badge-ui.test.ts`, `urls.test.ts`, `watcher.test.ts`

**Interfaces:**
- Consumes: `401 {"error":"signed_out"}` from `/api/check` (Task 1).
- Produces:
  - `type CheckReply = { ok: true; data: CheckResponse } | { ok: false; reason?: 'signed_out' }`
  - `signInUrl(appUrl: string): string` returns `` `${base(appUrl)}/auth/login` ``.
  - `renderState(host, state: 'checking' | 'unavailable' | 'signed_out', opts: BadgeOptions & { onRetry?: () => void })`

- [ ] **Step 1: Write the failing tests.**
  - `check.test.ts`: `it('reports a signed-out student, not a dead server')`. A mocked `json({ error: 'signed_out' }, 401)` resolves to `{ ok: false, reason: 'signed_out' }`. The existing 500 test still gives `{ ok: false }` with no `reason`.
  - `urls.test.ts`: `signInUrl('https://cs.example/')` returns `'https://cs.example/auth/login'`.
  - `badge-ui.test.ts`: `it('asks a signed-out student to sign in')`. Call `renderState(host, 'signed_out', { ...OPTS, onRetry })`. Assert:
    - `text()` contains `'Sign in to check listings'`, and doesn't contain `"Couldn't check"`.
    - After expanding, an `a` with the text `Sign in` has `href === 'http://localhost:3000/auth/login'` and `target === '_blank'`.
    - `button('Try again')!.click()` calls `onRetry` once.
  - `watcher.test.ts`: when `ask` resolves `{ ok: false, reason: 'signed_out' }`, the mounted host's text contains `'Sign in to check listings'`. Follow the file's existing setup.
- [ ] **Step 2: Run them.** `pnpm --filter @cs/extension test`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - `fetchCheck`: `if (res.status === 401) return { ok: false, reason: 'signed_out' };` goes before the `!res.ok` check.
  - `renderState('signed_out')`:
    - Tone `'none'`, label `'Sign in to check listings'`.
    - Panel text: "ChirieSigură checks are for signed-in students. Sign in on the website, then try again."
    - A primary `a` link, `Sign in` (built like the existing "Verify as a landlord" link at `badge-ui.ts:378`), then the secondary `Try again` button.
  - `watcher.ts` and `popup/main.ts`: route `!reply.ok && reply.reason === 'signed_out'` to `renderState(host, 'signed_out', …)`, with the same `onRetry` each one already uses for `'unavailable'`.
  - `isCheckResponse` doesn't change.
- [ ] **Step 4: Run them.** `pnpm --filter @cs/extension test && pnpm --filter @cs/extension compile`. Expected: all tests pass, and `tsc` reports no errors.
- [ ] **Step 5: Commit.**

```bash
git add apps/extension/lib apps/extension/entrypoints/popup/main.ts
git commit -m "feat(extension): sign-in state for signed-out students"
```

### Task 4: The `/check` page, a link to it on the home page, and sign-out

**Files:**
- Create: `apps/web/app/(phone)/check/page.tsx` (server: metadata, reads the session, renders the client)
- Create: `apps/web/app/(phone)/check/CheckForm.tsx` (`'use client'`)
- Test: `apps/web/app/(phone)/check/check.test.tsx` (jsdom, the `verify.test.tsx` fetch-stub style)
- Modify: `apps/web/app/page.tsx` (add "Check a listing" → `/check`)

**Interfaces:**
- Consumes:
  - `isSignedIn()` (Task 1).
  - `GET /api/check` → `CheckResponse | 401 {"error":"signed_out"}`.
  - `parseListingUrl(url, demoOrigin)` from `@cs/shared`.
- Produces: `CheckForm({ signedIn }: { signedIn: boolean })`.

Page behaviour:
- **Signed out:** a heading "Sign in to check listings", one line of explanation, and a primary link `Sign in` → `/auth/login?returnTo=/check`. There's no form.
- **Signed in:**
  - The form has three fields:
    - **Listing link** (`type="url"`, required).
    - **Code from the listing** (`inputMono`, placeholder `VC-XXXX`).
    - **Phone number shown on the listing** (optional, `type="tel"`).
  - Submitting calls `parseListingUrl(link, window.location.origin)`. It then fetches `/api/check?` with `site` and `listingId` when parsed, and `code` and `phone` when they're non-empty. Build the query with the same parameter names as the extension's `checkUrl`.
  - The verdict panel shows the response's `label`, with `data-status={status}`.
  - A 401 response switches to the signed-out view. Any other failure shows "Couldn't check this listing. Try again."
  - A `Sign out` text link goes to `/auth/logout`.
- Use the existing `phone.module.css` classes and `FrameBar` (zone "Check a listing"). Don't add new CSS unless the status needs a tone. If it does, add tone rules for `[data-status^="green"]`, `amber`, `red`, `grey` that reuse the page's existing colour tokens.

- [ ] **Step 1: Write the failing tests.** Render `CheckForm` directly. Add these tests:
  - `it('signed out: offers sign-in and no form')`: the `Sign in` link's `href` is `/auth/login?returnTo=/check`, and `screen.queryByLabelText(/Listing link/)` is null.
  - `it('sends the parsed listing, code and phone to /api/check and shows the verdict')`:
    - Type `http://localhost:3000/demo/listing/d1`, `VC-7K3Q` and `0700 000 001`.
    - The stubbed fetch is called with `/api/check?site=demo&listingId=d1&code=VC-7K3Q&phone=0700+000+001`.
    - The text `Verified landlord · near the address` is shown.
  - `it('an unsupported URL still asks the server, without a listing')`: `https://example.com/x` with `VC-7K3Q` fetches `/api/check?code=VC-7K3Q`. Stub the response as `{ status: 'grey_cannot_confirm', label: "Can't confirm" }`, and the page shows `Can't confirm`.
  - `it('switches to sign-in when the session has expired')`: the stub returns 401, and the `Sign in` link appears.
- [ ] **Step 2: Run them.** `pnpm --filter @cs/web test "app/(phone)/check"`. Expected: FAIL, because the module doesn't exist yet.
- [ ] **Step 3: Implement** `page.tsx` (`export const metadata = { title: 'Check a listing' }`, `const signedIn = await isSignedIn()`) and `CheckForm.tsx` as described above. Add the home page link.
- [ ] **Step 4: Run all web tests and lint.** `pnpm --filter @cs/web test && pnpm --filter @cs/web lint`. Expected: everything passes.
- [ ] **Step 5: Manual check** with the dev server and the user's Auth0 values, at a 375 px width:
  - Signed out, `/check` shows sign-in. After signing in, it lands back on `/check`.
  - Pasting the `d1` URL with `VC-7K3Q` shows the green label. `d2` shows "Copied from a verified listing".
  - Sign out works.
  - Run `impeccable detect --json "app/(phone)"` from `apps/web`, per the phone-pages skill.
- [ ] **Step 6: Commit.**

```bash
git add "apps/web/app/(phone)/check" apps/web/app/page.tsx
git commit -m "feat(web): /check page for students without the extension"
```

---

## Before Task 1: the user's setup

The builder can't create accounts. Before Task 1, step 7, the user must:
- Create an Auth0 **Regular Web Application** and turn on the Google social connection.
- Set the callback and logout URLs listed in the spec.
- Put the five env vars in `apps/web/.env.local` and in Vercel.

Steps 1–6 of Task 1 and all the unit tests run without them.
