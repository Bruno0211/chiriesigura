---
version: 1
slug: "app-phone-layout-tsx"
primary_target: "app/(phone)/layout.tsx"
related_targets: ["app/(phone)/verify/page.tsx","app/(phone)/viewing/[verificationId]/page.tsx","app/(phone)/privacy/page.tsx"]
---

# Surface brief: phone pages (/verify, /viewing/[verificationId], /privacy)

**Scope and mode:** `apps/web/app/(phone)/`, mobile web, max 480 px column. `/verify` and `/viewing` are **Operate**; `/privacy` is **Read**. Code-led build.

**Audience and job:** a skeptical landlord at the apartment door who must trust the page before typing an ID number; a student at a viewing who files one report in under 30 s; judges watching the phone mirrored to a projector.

**Proof and constraints:** say which check, who runs it (your mobile operator via Nokia Network as Code), and what is never kept. English UI; verbatim strings from the team plan Tasks 9–11; mobile data, not Wi-Fi; "near the address", never "inside". No padlock or shield art, no fake progress, no colour-only state.

**Unresolved:** `?code=` on the viewing QR URL (Person 4); /privacy contact email; root metadata title (Person 1).

## Direction contract

THESIS: Verification is a short ride with four stops. The check record is a tram-line diagram whose stops light up as the mobile operator answers, and the issued code is the destination sign at the terminus. It refuses the old bank-statement frame (indigo bar, uppercase tab headers, mono for everything) and the generic KYC card stack (icon tiles, progress bar, check-circle pop).

OWN-WORLD: White page; ink #141414 (secondary #4B4F58, tertiary #6A6F7A). One line colour, cobalt #1F4FD6, for the route line, the active stop, primary buttons, links, focus rings and the brand badge; cool grey #F2F3F5 for secondary blocks; rules #E2E4E9. State colours stay quarantined to stop discs, state words, alerts and the connection chip: ok #13804B, fail #C4291C, warn amber ink #8A4F00 on #FDF1D8. Atkinson Hyperlegible Next for every word and number (tabular figures); JetBrains Mono only for the issued code and the paste line. Brand mark: a 38 px rounded-square cobalt "VC" line badge, like a tram line number, beside "ChirieSigură". Friendly, modern, calm, legible on a projector; not playful, not dark, not generic startup (no gradients, glass, purple, emoji).

STORY: The landlord sees the route (four stops, then "Your code"), who checks it and what is never kept; agrees; watches each stop light up as the operator answers, a small marker travelling down the line while a request is in flight; arrives at the destination sign carrying the code and copies the line to paste into each listing. A failed stop rings red and the line after it breaks into grey dashes, so it is plain where the ride stopped. The student rides a two-stop line (number, at the address) to "Your report" and files one category.

FIRST VIEWPORT: White header: the cobalt VC badge and "ChirieSigură" left, "Stop 1 of 6" right; under it the connection chip (grey pill with a status dot, amber on Wi-Fi). H1 "Verify as a landlord" at 34 px/800 with the lead "At the apartment, on mobile data. About 3 minutes." The route: four stops on a 6 px cobalt line (Phone number, marked "Next"; ID matches the SIM owner; No recent SIM change; Phone near the apartment), each with its one-line how, ending at the rounded-square "Your code" terminus. A grey "We keep / Never kept" block, then "Checked by your operator via Nokia Network as Code". The cobalt primary "I agree — start the checks" pinned in the thumb zone with the privacy link under it.

FORM: Tram Line, the model's top-ranked grounded candidate, chosen by the user over the roll's Starter Pack; seed: 432f597e7b397494. Signature move, the record as a vertical line diagram: stop discs (white, 5 px ring) on a 6 px line; waiting stops and the line ahead grey; the running stop cobalt with a marker travelling down its segment while its request is in flight; passed stops filled ok-green with a drawn check; a failed stop red-ringed with the line after it dashed grey; the terminus a rounded square. On the done screen the line runs into the destination sign: a cobalt plate with the code in large white JetBrains Mono cells (the largest type on the screen, readable across a room), then the paste line in a selectable box and "Copy the line". Steps are counted as "Stop n of 6" in the header; the 15-minute session clock joins the connection chip as a pill once the number is confirmed and turns amber in its last minute. One authored moment: a stop lighting up as its result posts (exponential ease-out, staggered like a passing tram); all motion off under prefers-reduced-motion. The extension badge is the same world at badge scale: a white card (the only surface with a soft shadow, as it floats on third-party pages), the VC badge header, a status line where state colour lives, the listing's checks as a mini line diagram, cobalt buttons.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
