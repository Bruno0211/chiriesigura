---
name: chiriesigura-test-and-plan-commands
description: Use when running pnpm tests or typecheck in chiriesigura.
category: testing
---

Run tests and typecheck per package with pnpm filters from the repo root. `pnpm -r test` runs all packages.

- Web: `pnpm --filter @cs/web test` runs the whole web suite. To run specific files, use `pnpm --filter @cs/web exec vitest run lib/cases.test.ts app/api/check`; `test -- <paths>` ignores the path filter and runs everything.
- Shared rules: `pnpm --filter @cs/shared test`. Extension: `pnpm --filter @cs/extension test` (both are `vitest run`).
- Typecheck the web app: `pnpm --filter @cs/web exec tsc --noEmit`. In a fresh worktree it fails with `Cannot find name 'LayoutProps'` in app/layout.tsx; run `npx next typegen` in `apps/web` once, then re-run it.
- Web 5000 ms timeouts, or failures only under parallel workers: see `chiriesigura-web-test-workers`.
- After `pnpm --filter @cs/web db:generate`, read the new file under `apps/web/drizzle` and confirm it holds only the intended DDL before committing.
- Specs go in `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`; plans in `docs/superpowers/plans/YYYY-MM-DD-<topic>-stage-N.md`.
- The tree often holds other sessions' uncommitted files. Run `git status` first and stage only the paths the task names.
