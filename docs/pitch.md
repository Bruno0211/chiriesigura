# ChirieSigură: 3-minute pitch

Track: Connected Communities (UniHack 8, Timișoara). Live URL: https://chiriesigura.vercel.app

## Before you go on stage

1. Reset the demo: `pnpm --filter @cs/web seed:prod` (needs `apps/web/.env.prod.local`, see [checkpoints.md](checkpoints.md)).
2. Laptop: Chrome with the extension loaded unpacked from `apps/extension/.output/chrome-mv3` (built with `WXT_APP_URL=https://chiriesigura.vercel.app`). Tabs open: `/demo/listing/d1`, `/demo/listing/d2`.
3. Laptop Chrome: sign in at `https://chiriesigura.vercel.app/auth/login` (the extension shows no badges until you do).
4. Landlord phone: `https://chiriesigura.vercel.app/verify` open, on **mobile data**.
5. Student phone: signed in at `https://chiriesigura.vercel.app/check`, on mobile data.
6. Team phone: signed in with an email listed in `REVIEW_EMAILS`, `https://chiriesigura.vercel.app/review` open.
7. Backup: the recorded demo video, on the laptop desktop, in case the network fails.

Demo inputs (live on Nokia's simulator; mock mode accepts them too):

| Who | Phone | Other |
|---|---|---|
| Landlord | `+99999992002` | Zoltan Eszter, 1995-03-12, ID `66666666q` (Nokia's test identity), address `Strada Alba Iulia 2, Timișoara`, listing `https://chiriesigura.vercel.app/demo/listing/d4` |
| Student | `+99999992000` | "Landlord didn't show up" |
| Landlord, far-away listing (optional) | `+99999992002` | after the location check, paste `https://chiriesigura.vercel.app/demo/listing/d6` (Lugoj): "This listing isn't near the address you verified" |

## Script

<!-- Timings are estimates: time the whole run at rehearsal. If over 3:00, skip the d6 detour first, then shorten the opening's three cases to two. -->

### 0:00–0:30 · The problem

> September in Timișoara. Ioana finds a two-room flat near Politehnica: good photos, fair price. The "owner" is abroad, so he asks for a deposit to hold it. She pays. The number stops answering. The flat was never his.
>
> This isn't hypothetical. This month, police in Arad are chasing a fake landlord who took deposits and the first month's rent, paid in crypto. In Brașov, an agent described one "owner" taking a €100–200 holding fee from around a hundred people for the same flat. And in one reported case, the scammer used a real man's ID card: he only found out when strangers turned up at his door.
>
> OLX and Storia can't tell you who's actually behind a listing. The mobile network can.

### 0:30–2:30 · Live demo

1. **Landlord verifies (phone, ~45 s).** "Zoltan owns this flat. He opens ChirieSigură on his phone, on mobile data."
   - Consent screen: "it names every check before anything runs, and we keep the result, never the ID."
   - Number Verification: "the operator confirms this SIM really is his number. No SMS code to phish."
   - ID details → **KYC Match**: "the operator checks the name, birthdate and ID number against the subscriber who owns this number. A stolen ID card fails here, because it doesn't belong to whoever holds the phone."
   - **SIM Swap**: "no recent SIM change, so this isn't a hijacked number." (The real rule is 7 days; on Nokia's simulator production checks the last hour.)
   - "I'm at the apartment" → **Location Verification**: "his phone is at the address he gave, according to the network, not GPS he can fake."
   - Paste the d4 listing URL → a code appears. "He pastes this line into his listing. The code only counts on the listings he registered." Then: "Why would he bother? Students already ask for proof, and verified listings get answered first. Three minutes, once, and it works on every listing."
2. **Student sees a verified listing (laptop, ~15 s).** Open `d1`, a listing he verified earlier with `VC-7K3Q`. Badge: 🟢 *Verified landlord · near the address*. "It also matched the phone number shown on the page."
3. **The scammer's copy (laptop, ~15 s).** Open `d2`: same text, same photos, same code, €130 cheaper, different phone. Badge: 🔴 *Copied from a verified listing*. "Copying the code doesn't help: it's bound to the original listing."
4. **Viewers keep it honest (student phone, ~25 s).** "At the viewing, the student only has a phone." On `/check`, paste the `d1` link and code `VC-7K3Q`, then tap **I'm at the viewing · Report it**. The student confirms their number, taps "I'm at the viewing" (the network checks they're really at the address), then picks "Landlord didn't show up". Reload `d1` on the laptop: 🟠 *Verified, but warnings from viewers*. "Only people who were physically there can report, one report per phone."

5. **Scammers are banned for life (team phone, ~20 s).** "Mihai verified with his real ID, and three viewers he asked for money reported him." On `/review`, Zoltan now shows too: the no-show we just filed is his third. "One bad week doesn't ban anyone: a human decides." Tap **Confirm ban** on the card reading *3 asked for money first*. Laptop: reload `d5`: 🔴 *Landlord banned*. "A new SIM won't help him: the ban follows his ID card, not his phone."

### 2:30–3:00 · Why it works

> Each network signal alone can be dodged. Together, a scammer would need the real owner's ID, their SIM, and to stand in the flat.
>
> **Privacy:** we store a match result and a fingerprint that can only answer *is this a banned person?*, never your ID. Phone numbers are kept only as salted hashes, and nothing about the landlord is shown to students beyond the badge.
>
> **The honest limit:** a scammer would have to use their real identity, and viewers catch them.
>
> **Next:** an ANCPI land-registry check that the verified person owns the flat, more sites (Storia, imobiliare.ro), and partners: student unions, insurers and agencies who want verified listings.
>
> ChirieSigură: the network already knows who's real. We let students see it.

## Slides (5)

1. **Problem:** a student, a deposit, a vanished landlord, plus the three Romanian cases above.
2. **Demo:** live (cut to the backup video if the network fails).
3. **How it works:** the four signals as four icons, each with the one thing it proves.
4. **Privacy:** "we keep a fingerprint that can only answer: is this a banned person?", plus the hash and consent points.
5. **Next:** ANCPI owner check · more sites · partners. Team names.

## Sources for the opening

- Arad, deposits paid in crypto (Nov 2026): [cugetliber.ro](https://cugetliber.ro/stiri-eveniment-escrocherie-cu-chirii-false-victimele-plateau-garantia-si-prima-luna-in-criptomonede-568681)
- Arad, fake "owner" sought by police: [stiripesurse.ro](https://www.stiripesurse.ro/escrocherie-cu-chirii-in-arad-proprietarul-incasa-bani-in-avans-apoi-isi-bloca-victimele-politia-il-cauta_3915436)
- Brașov and other university cities, holding fees from many students: [bizbrasov.ro](https://bizbrasov.ro/2024/09/04/escrocii-schema-bani-studentii-orase-universitare/)
- Stolen identity used for fake rentals: [hotnews.ro](https://hotnews.ro/cum-se-fura-identitati-in-romania-banii-duc-catre-firma-fondata-de-hackerul-din-dosarul-hexi-pharma-cel-care-pacaleste-acesti-oameni-foloseste-buletinul-meu-2080098)

Before the pitch, read each article once and check that the figures you say match it. These are news reports, not official statistics; say "reported", not "proven".
