# 0.1% commission analysis (2026-11-14, estimates)

Question: take 0.1% of the rent a landlord earns from a verified flat, instead of the one-time student payment.

Verdict: no. The fee costs about as much to collect as it brings in, the product never sees the rent, and paying only on passing checks conflicts with what the badge means.

## Inputs

- 2-room flat, Timisoara: about EUR 400-450/month. Storia April 2026: EUR 400. Economedia July 2026: EUR 450. Wall-street.ro January 2026: EUR 430. Sources differ in date and method.
- Stripe EU card rate: 1.5% + EUR 0.25 (2023 support article; a third-party summary gives 1.5% + RON 1.00). Stripe's Romania page was not read.
- Nokia API price: not published for Number Verification or KYC Match. Third-party figures: USD 0.04-0.07 per call for CAMARA identity APIs on a marketplace (STL Partners, undated); USD ~0.01 per call for location and device status, not identity. Treat as unverified.
- Agency commission in Romania: about one month's rent per lease (sources vary).

## Arithmetic (estimate)

| Item | Value |
|---|---|
| 0.1% of rent, per month | EUR 0.40-0.45 |
| 0.1% of rent, per year | EUR 4.80-5.40 |
| Card fee on one monthly charge | ~EUR 0.26, i.e. 57-64% of the fee |
| Student one-time EUR 2.99 after card fee | ~EUR 2.70 |
| Verification cost (4 Nokia calls) | USD 0.04-0.28 |
| Viewing report cost (2 calls) | USD 0.02-0.14 |

## Reasons against a percentage

1. The rent is paid landlord to tenant; the product would need the price and a monthly bill, and would enforce by switching off the badge.
2. Revenue only when a landlord passes creates an incentive to pass, against the project principle that a badge lending trust to a scammer is worse than none.
3. The side paying least wants the service least. In a university city a landlord who refuses has many tenants to pick from.
4. Landlords would have to disclose rent. Some listings advertise a registered contract (ANAF), so not all landlords register; frequency unknown.

## Options left open

- Keep the EUR 2.99 student payment.
- Flat landlord fee before checks, at least EUR 0.30 plus up to USD 0.28 of API cost. No data on willingness to pay.
- Business customers (agencies, student unions, insurers), per the pitch's Next slide.
