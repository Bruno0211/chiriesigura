# Team kickoff — one Claude Code session per laptop

## Every laptop, first 15 minutes
- Node 22+, pnpm (`npm i -g pnpm`), Git, Claude Code with the **superpowers** plugin. Person 4 also needs Chrome.
- Clone the repo once Person 1 has pushed Task 1. Everyone works on `main`. Tracks touch separate folders, so run `git pull --rebase` before every push and conflicts stay rare.
- Copy `.env.example` → `apps/web/.env.local` and fill it in. Person 2 shares `DATABASE_URL`, `PHONE_PEPPER` and `NAC_TOKEN` in the team chat.

## While Person 1 does Task 1
- Person 2: create the Vercel project and provision Postgres via the Marketplace. Sign up for Nokia Network as Code and grab an API key plus a simulator phone number.
- Person 3: ask the Nokia mentor (1) do we get API keys or live access, (2) simulated or real Romanian SIMs, (3) the minimum Location Verification radius. Post the answers in chat.
- Person 4: sign up for the Orange Network APIs Playground (backup). Save one real OLX listing page (Ctrl+S) for the Task 12 fixture.

## Prompt to paste into Claude Code (change the bracketed parts)

```
Read docs/superpowers/specs/2026-11-13-rental-trust-layer-design.md and
docs/superpowers/plans/2026-11-13-rental-trust-layer.md.

I am [Person N], track [S+D | C | P | E]. Use superpowers:executing-plans to
implement ONLY Tasks [2, 13, 14 | 3, 4, 5, 6, 7, 8 | 9, 10, 11 | 12], in order.
Do not edit files outside my track's folders listed in the plan's
"Team, tracks and timing" table; if I need a change in shared code or the
API contract, stop and tell me so I can ask the team.
After each task: run all tests, `git pull --rebase`, commit, push to main.
```

Person 1 runs Task 1 first with the same prompt and "Tasks 1, 2, 13, 14".

## Checkpoints
- **Sat 14 Nov 18:00**: the full demo works end-to-end on the deployed URL (plan Task 14, Step 2).
- **Sun 15 Nov 12:00**: feature freeze. **13:30**: two timed rehearsals. **15:00**: judging.
