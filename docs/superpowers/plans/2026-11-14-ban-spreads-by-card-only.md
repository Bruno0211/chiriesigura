# Ban Spreads by Card Only Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Confirming a ban spreads only to landlord rows sharing the ID card hash, never to rows that share only name + birthdate.

**Architecture:** One change in `banPerson`, in `apps/web/lib/queries.ts`: stop matching on `nameBirthHash`. The `/verify` refusal on either hash stays as it is.

**Tech Stack:** Drizzle + PGlite tests, Vitest.

**Spec:** [docs/superpowers/specs/2026-11-14-landlord-ban-and-phone-review-design.md](../specs/2026-11-14-landlord-ban-and-phone-review-design.md) §4.3 and §4.9 (option C)

## Global Constraints

- `/api/verify/identity` behaviour does not change: a match on either hash is still refused.
- Commit messages carry no Co-author lines (project skill `chiriesigura-phone-pages`).

## Review Focus

1. **A row with a null `idDocHash`** (verified before the fingerprint migration). Banning it must ban only that row, never every row with a null hash. Pinned in Task 1.

---

### Task 1: `banPerson` matches only the ID card hash

**Files:**
- Modify: `apps/web/lib/queries.ts` (`banPerson`), `apps/web/app/api/review/review.test.ts`

**Interfaces:**
- Unchanged: `banPerson(db: Db, landlordId: string): Promise<boolean>`.

- [ ] **Step 1: Rewrite the spread test in `review.test.ts`**
  - Rename `a ban spreads to the person's other phone numbers` to **`a ban spreads through the ID card hash only`**.
  - Give the seeded landlord `idDocHash: 'card-1'` and `nameBirthHash: 'name-1'`. Insert three more rows:
    - `same-card`: `idDocHash: 'card-1'`, `nameBirthHash: 'name-2'`;
    - `namesake`: `idDocHash: 'card-9'`, `nameBirthHash: 'name-1'`;
    - `legacy`: `idDocHash: null`, `nameBirthHash: null`.
  - Ban the seeded landlord, then expect `bannedAt`:
    - not null on `same-card`;
    - null on `namesake`;
    - null on `legacy`.
- [ ] **Step 2: Run** `pnpm --filter @cs/web test app/api/review`. Expected: FAIL on `namesake` being banned.
- [ ] **Step 3: Implement.** In `banPerson`, drop the `nameBirthHash` condition. Keep `eq(landlord.id, l.id)` and, only when `l.idDocHash` is non-null, `eq(landlord.idDocHash, l.idDocHash)`. Update the doc comment to say the ban follows the card.
- [ ] **Step 4: Run** `pnpm -r test`. Expected: all PASS. `scripts/seed.test.ts` still bans Mihai and refuses his identity.
- [ ] **Step 5: Commit** `fix(web): a ban spreads only through the ID card number`
