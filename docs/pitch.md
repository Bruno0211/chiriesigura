# ChirieSigură: 3-minute pitch

Track: Connected Communities (UniHack 8, Timișoara). Live URL: https://chiriesigura.vercel.app

Deck: [ChirieSigura-pitch.pptx](ChirieSigura-pitch.pptx) (speaker notes carry this script) · PDF backup: [ChirieSigura-pitch.pdf](ChirieSigura-pitch.pdf). Fill in the team names on slide 7 before the pitch.

One message for the judges: **the mobile network already knows who is real; ChirieSigură lets renters see it, for €1.**

## Before you go on stage

1. Reset the demo: `pnpm --filter @cs/web seed:prod` (needs `apps/web/.env.prod.local`, see [checkpoints.md](checkpoints.md)).
2. Laptop: Chrome with the extension loaded unpacked from `apps/extension/.output/chrome-mv3` (built with `WXT_APP_URL=https://chiriesigura.vercel.app`). Tabs open: `/demo/listing/d1`, `/demo/listing/d2`.
3. Laptop Chrome: sign in at `https://chiriesigura.vercel.app/auth/login` (the extension shows no badges until you do).
4. Landlord phone: `https://chiriesigura.vercel.app/verify` open, on **mobile data**, mirrored to the projector.
5. Student phone: signed in at `https://chiriesigura.vercel.app/check`, on mobile data, with the `d1` link and `VC-7K3Q` already pasted.
6. Backup: the recorded demo video on the laptop desktop, in case the network fails.
7. Team phone for Q&A only: signed in with an email in `REVIEW_EMAILS`, `/review` open.

Demo inputs (live on Nokia's simulator; mock mode accepts them too):

| Who | Phone | Other |
|---|---|---|
| Landlord | `+99999992002` | Zoltan Eszter, 1995-03-12, ID `66666666q` (Nokia's test identity), address `Strada Alba Iulia 2, Timișoara`, listing `https://chiriesigura.vercel.app/demo/listing/d4` |
| Student | `+99999992000` | "Landlord didn't show up" |

## Script (3:00)

<!-- About 150 words a minute outside the demo. Time the whole run at rehearsal; if it runs long, cut the Brașov sentence first, then the viewer report beat. -->

### 0:00–0:15 · Slide 1, the hook

> September in Timișoara. Ioana finds a flat near Politehnica. The owner is abroad, so he asks for a deposit to hold it. She pays. The number stops answering. The flat was never his.

Pause, then click.

### 0:15–0:30 · Slide 2, the problem

> It keeps happening. In Arad this month, deposits paid in crypto. In Brașov, one fake owner took a holding fee from about a hundred people for the same flat. Listing sites can't tell you who is behind a listing. The mobile network can.

### 0:30–0:45 · Slide 3, how it works

> ChirieSigură asks the landlord's operator four questions through Nokia's Network as Code: is it his phone, is it his ID, was the SIM swapped, and is he at the flat. Pass all four and he gets a code for his listings. Let me show you.

### 0:45–2:15 · Slide 4, live demo (90 s)

1. **Landlord verifies (phone, ~45 s).** "Zoltan owns this flat. On mobile data, he opens ChirieSigură. Every check is named before anything runs." Tap *I agree*. "The operator confirms this SIM is his number: no SMS code to phish." Enter the ID details. "It matches his name, birthdate and ID against the SIM's owner: a stolen ID card fails here. No recent SIM swap." Tap *I'm at the apartment*. "And his phone is at the address, by the network, not GPS he can fake." Paste the `d4` link. "Here's his code. It only counts on the listings he registered."
2. **Verified listing (laptop, ~15 s).** Open `d1`. "A student browsing sees this: Verified landlord, near the address. It also matched the phone number on the page."
3. **The scammer's copy (laptop, ~15 s).** Open `d2`. "Same photos, same code, €130 cheaper. Red: copied from a verified listing. Copying the code doesn't help."
4. **Viewer report (student phone, ~15 s).** "After a viewing, only a phone the network places at the address can report." Tap *I'm at the viewing*, pick "Landlord didn't show up", reload `d1` on the laptop: "Now every student sees the warning."

### 2:15–2:35 · Slide 5, why we win

> What do renters do today? An ID photo can be stolen. A listing account is just a phone number. Scam-score extensions guess from the text. An agency works, but costs about a month's rent. Only ChirieSigură asks the mobile network itself.

### 2:35–2:50 · Slide 6, price

> And it costs a renter one euro. Once. Unlimited checks, forever. Landlords verify free, so there's no reason not to. One euro, against a four-hundred-euro deposit.

### 2:50–3:00 · Slide 7, close (leave it up for Q&A)

> Next: an ownership check with the ANCPI land registry, more listing sites, and student unions as partners. The network already knows who's real. ChirieSigură lets renters see it. Thank you.

## Q&A

Backup slides 8–10 (privacy, honest limits, €1 economics) sit after the close.

- **"What do you store?"** Slide 8. "A match result and a fingerprint that can only answer *is this a banned person?*, never the ID. Phone numbers only as salted hashes."
- **"What if the scammer uses his real ID?"** Slide 9, then the ban step on the team phone: on `/review`, tap **Confirm ban** on the card reading *3 asked for money first*, reload `d5`: 🔴 *Landlord banned*. "The ban follows his ID card, not his SIM."
- **"Can a verified landlord list any flat?"** Open `/demo/listing/d7`: a real code (`VC-CLJ7`) on a flat in Cluj, from a landlord verified in Timișoara → 🔴 *Listing is far from where the landlord verified*. "A different flat in the same city is what the ANCPI ownership check closes."
- **"Does €1 pay for it?"** Slide 10. About €0.27 card fee and a few cents of network calls per report leave roughly €0.60–0.70 per renter. Estimates: Nokia hasn't published per-call prices.

## Slides

1. Hook: "Who is really behind this rental listing?" over a listing with the verified badge.
2. Problem: the "send the deposit" line and three reported cases (Arad, Brașov, stolen ID).
3. How it works: the four network checks as stops on a line, ending in the code and badge.
4. Live demo: the four beats to watch, with the green and red badges.
5. Why we win: ID photo, listing account, scam-score extensions, agency vs ChirieSigură.
6. Price: €1 once, against a lost deposit (~€450) and an agency fee (~one month's rent).
7. Close: the one-line message, next stops, team, URL.
8–10. Backup for Q&A: privacy, honest limits, €1 economics.

## Sources for the opening

- Arad, deposits paid in crypto (Nov 2026): [cugetliber.ro](https://cugetliber.ro/stiri-eveniment-escrocherie-cu-chirii-false-victimele-plateau-garantia-si-prima-luna-in-criptomonede-568681)
- Arad, fake "owner" sought by police: [stiripesurse.ro](https://www.stiripesurse.ro/escrocherie-cu-chirii-in-arad-proprietarul-incasa-bani-in-avans-apoi-isi-bloca-victimele-politia-il-cauta_3915436)
- Brașov and other university cities, holding fees from many students: [bizbrasov.ro](https://bizbrasov.ro/2024/09/04/escrocii-schema-bani-studentii-orase-universitare/)
- Stolen identity used for fake rentals: [hotnews.ro](https://hotnews.ro/cum-se-fura-identitati-in-romania-banii-duc-catre-firma-fondata-de-hackerul-din-dosarul-hexi-pharma-cel-care-pacaleste-acesti-oameni-foloseste-buletinul-meu-2080098)
- Rent and deposit: about €400–450 a month for a 2-room flat in Timișoara (Storia April 2026, Economedia July 2026, wall-street.ro January 2026); agencies charge about one month's rent.

Before the pitch, read each article once and check that the figures you say match it. These are news reports, not official statistics; say "reported", not "proven".
