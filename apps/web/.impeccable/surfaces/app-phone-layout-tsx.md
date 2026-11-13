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

THESIS: The phone pages are a bank confirmation, not a KYC vendor card: a framed secure zone where each network check posts a timestamped, masked line into a running record, and the code lands as its last line. It refuses the white card, blue primary, shield icon, progress dots and check-circle pop.

OWN-WORLD: Deep indigo frame bar (#23205A) over a lilac-grey ground (#F0EFF6); white modules ruled in #CFCBE3, each headed by a small uppercase tab naming its contents and what happens to its data. Public Sans for words, JetBrains Mono for every number, code, time and state word. State colour (ok #0F7A4A, fail #B3261E, warn amber) lives only in status cells and the code plate; indigo marks only the active step. Raises kept: colour quarantine (lexicon), one tabular mono grammar (datamatics), ruled tab-headed modules (high-density), one reserved ink for the active step (orienteering), one job per screen (guide map).

STORY: The landlord sees what will be checked, by whom, and what is never kept; agrees; watches four operator checks post into the record; copies a code to paste into each listing. The student proves they are at the door and files one category report.

FIRST VIEWPORT: Indigo frame bar: ChirieSigură left, "Secure verification" right; under it the mobile-data chip and STEP 1 / 6 in mono. H1 "Verify as a landlord" at 28 px with a one-line lead. A "What will be checked · By your operator" record of four numbered rows (01–04, PENDING in mono) with a "via Nokia Network as Code · CAMARA" footer. A Kept / Never kept split module. The indigo primary "I agree — start the checks" sits in the thumb zone with the privacy link under it.

FORM: Romanian bank 3-D Secure / SMS-code confirmation screen, position 6 of 7 on the grounded list, assigned by the roll; seed: 82be24c117e2e7fc. Signature move, the masked record: each passed check posts a timestamped line (the phone shown masked, +40 7•• ••• 001), a live 15-minute session clock runs in the frame bar once the number is verified, and the code lands as the record's final line in segmented one-time-code cells at projector scale.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
