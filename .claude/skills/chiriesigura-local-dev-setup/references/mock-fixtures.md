# Mock fixtures and seeded demo data

Source: `apps/web/lib/network/mock-fixtures.ts`. Any phone not listed passes every check.

| Phone | Mock behaviour |
|---|---|
| +40700000001 | landlord, all pass |
| +40700000002 | SIM swapped |
| +40700000003 | ID document false |
| +40700000004 | location FALSE |
| +40700000005 | location PARTIAL |
| +40700000006 | number verification via wifi |
| +40700000009, +40700000010 | the seeded scammer and his new SIM, pass everything |

Seed output on a fresh local run: VC-7K3Q on demo:d1 with two earlier all-good reports; demo:d4 free; VC-BAN5 on demo:d5 with three open cases; VC-CLJ7 on demo:d7 (far away).

The seed and this table can drift. Re-read the fixture file and the seed script before trusting a count.
