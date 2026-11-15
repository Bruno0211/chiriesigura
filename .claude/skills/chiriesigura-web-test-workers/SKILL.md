---
name: chiriesigura-web-test-workers
description: Use when web vitest tests hit a 5000 ms timeout, or fail only under default parallel workers.
category: testing
---

# Web tests that time out only in parallel

Timeouts in test database setup, on tests that pass alone, come from machine load under parallel workers, not from the code. Before debugging, rerun the web suite with fewer workers: `npx vitest run --maxWorkers=4` in `apps/web` (the last clean run passed 154 of 154). If 4 still times out, step down to `--maxWorkers=2` (a full run at 2 passed 175 of 175 where default workers hit 8 hook timeouts). A test that times out at default workers and passes alone is load, not a code fault; rerun once before calling it a failure.

- Confirm the failing tests pass alone before reporting them as failures.
- Report the cause as load only after a clean lower-worker run.
