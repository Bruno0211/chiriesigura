---
name: ChirieSigură
description: A bank-confirmation secure zone where the mobile network vouches for the landlord, one masked line at a time.
colors:
  frame: "#23205a"
  frame-hi: "#322e7a"
  frame-ink: "#ffffff"
  frame-ink-2: "#d3cff4"
  frame-muted: "#8f8bb0"
  ground: "#f0eff6"
  surface: "#ffffff"
  surface-2: "#f8f7fc"
  tab: "#e4e1f2"
  selected: "#ebe9f8"
  rule: "#cfcbe3"
  rule-soft: "#e7e5f1"
  field: "#a9a4cc"
  ink: "#15132b"
  ink-2: "#45425e"
  ink-3: "#575472"
  ok: "#0f7a4a"
  ok-bg: "#e2f2e9"
  fail: "#b3261e"
  fail-bg: "#fbe8e6"
  warn: "#8a5300"
  warn-bg: "#fdf0d5"
typography:
  display:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  brand:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Public Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.06em"
  mono-code:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "clamp(32px, 10vw, 44px)"
    fontWeight: 700
    lineHeight: 1
  mono-meta:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  mono-state:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.06em"
rounded:
  xs: "3px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "15px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.frame-ink}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
    height: "54px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.frame-hi}"
  button-primary-disabled:
    backgroundColor: "{colors.frame-muted}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.frame}"
    rounded: "{rounded.lg}"
    padding: "12px 20px"
    height: "54px"
    width: "100%"
  button-secondary-hover:
    backgroundColor: "{colors.selected}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    height: "52px"
  module:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  module-tab:
    backgroundColor: "{colors.tab}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    padding: "7px 12px"
    height: "34px"
  state-cell:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-3}"
    typography: "{typography.mono-state}"
    rounded: "{rounded.sm}"
    padding: "4px 9px 4px 7px"
    height: "30px"
  state-cell-ok:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok}"
  state-cell-fail:
    backgroundColor: "{colors.fail-bg}"
    textColor: "{colors.fail}"
  state-cell-checking:
    textColor: "{colors.frame}"
  frame-bar:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.frame-ink}"
    padding: "14px 20px"
  connection-chip:
    backgroundColor: "{colors.frame-hi}"
    textColor: "{colors.frame-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
    height: "30px"
  code-plate-tab:
    backgroundColor: "{colors.frame}"
    textColor: "{colors.frame-ink-2}"
    typography: "{typography.label}"
  code-cell:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.frame}"
    typography: "{typography.mono-code}"
    rounded: "{rounded.md}"
    width: "clamp(44px, 13.5vw, 58px)"
    height: "clamp(58px, 17vw, 74px)"
---

# Design System: ChirieSigură

## Overview

**Creative North Star: "The Confirmation Screen"**

Every surface is a Romanian bank's 3-D Secure / SMS-code confirmation, not a KYC vendor card. A deep indigo frame bar marks the secure zone; under it, on a lilac-grey ground, white modules ruled in hairlines carry the record of what is being checked. Each network check posts a timestamped, masked line into a running record (`+40 7•• ••• 001`), and the issued code lands as the record's final line in segmented one-time-code cells, large enough to read off a projector.

The system is dense and procedural, the way a bank statement is: small uppercase tab headers name what a module holds and what happens to its data, numbers run in one tabular mono grammar, and colour is quarantined so that green and red always mean a result, never decoration. One column, one job per screen, the action pinned in the thumb zone. Trust is shown by naming the check, who runs it and what is never kept, not by security iconography.

Two surfaces share the system. The phone pages (`apps/web/app/(phone)/`) are the canonical source. The Chrome extension's listing badge (`apps/extension/lib/badge.css`) re-declares the same colour, radius and easing tokens verbatim, bundles the same two faces (loaded from bytes through the FontFace API as "CS Public Sans" and "CS JetBrains Mono" so a listing site's CSP cannot block them), and reads as a code plate at badge scale: indigo frame, status cell, ruled tab-headed modules.

**Key Characteristics:**
- Indigo frame bar over a lilac-grey ground; white ruled modules, no floating cards.
- Every module opens with an uppercase tab naming its contents and its data handling.
- Every number, code, time, masked identifier and state word in tabular JetBrains Mono.
- State colour lives only where a result is stated; indigo marks the secure zone and what can be acted on now.
- The confirmation record (idx · label · state) is the signature structure; the code plate is its last line.
- Flat: depth is tonal layering and 1px rules, never shadow, on the phone pages.

## Colors

A cool indigo-and-lilac institutional palette with three quarantined state hues.

### Primary
- **Secure-Zone Indigo** (frame): the frame bar, primary button fill, secondary button stroke and text, links, focus rings, the caret, the code plate's border and tab, the code characters and slot marks, the active step's index, the "checking" state, radio accent. Also the browser `themeColor`, so the OS chrome joins the frame.
- **Raised Indigo** (frame-hi): primary hover and the connection chip on the frame bar.
- **Frame Lilac Ink** (frame-ink-2): secondary text on the frame (zone label, step count, session clock) and on the code plate tab; also the text selection fill.
- **Muted Indigo** (frame-muted): the disabled primary button.

### Tertiary (state, quarantined)
- **Ledger Green** (ok / ok-bg): passed checks, confirmed lines, the tally's "All good" mark, ok alerts.
- **Refusal Red** (fail / fail-bg): failed checks, error alerts, field errors, invalid input borders, rejected-listing reasons.
- **Notice Amber** (warn / warn-bg): warn alerts and the Wi-Fi connection chip.
- On the dark frame only, the status tints are lifted for contrast: a mint dot (#5bd69a) for mobile data, an amber dot (#c27a00) on the Wi-Fi chip, and a pale amber session clock (#ffd38a) in its last minute.

### Neutral
- **Lilac-Grey Ground** (ground): the page behind everything; also the pinned action's fade scrim.
- **Statement White** (surface): module, input and secondary-button fill.
- **Faint Lilac** (surface-2): module footers, neutral state cells, code cells, the paste line.
- **Tab Lilac** (tab): module tab headers, notices, tags, skeletons.
- **Selected Lilac** (selected): a chosen option row; secondary hover.
- **Hairline Lilac** (rule): module borders, tab and footer dividers, split dividers.
- **Soft Hairline** (rule-soft): row dividers inside a module, neutral state-cell border.
- **Field Stroke** (field): input borders, the dashed paste-line border.
- **Ink** (ink), **Ink 2** (ink-2), **Ink 3** (ink-3): headings and body; secondary copy and tab text; mono meta, indices and idle state words.

### Named Rules
**The Colour Quarantine Rule.** Green, red and amber appear only where a result or condition is stated: state cells and state icons, alerts, field errors and reasons, the connection chip and the session clock. Never on headings, module chrome, buttons, the ground or decoration. If a colour does not answer "did it pass?", it is not a state colour.

**The Reserved Indigo Rule.** Indigo is the secure zone and the thing in hand: the frame, the action, the code plate, the active step and the check that is running. Neutral rows, finished rows and idle copy stay in the lilac inks. A second accent hue is not part of this system.

## Typography

**Body Font:** Public Sans (with system-ui, -apple-system, Segoe UI, sans-serif), `latin` + `latin-ext` subsets so ă â î ș ț render.
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, Menlo, monospace), same subsets.

**Character:** A civic grotesque for words and a tabular mono for anything a bank would print in a column. The pairing reads as a statement: words explain, mono records.

### Hierarchy
- **Display** (700, 28px, 1.15, -0.02em, balanced wrap): the one H1 per screen.
- **Brand** (700, 18px, -0.01em): the product name on the frame bar.
- **Title** (600, 17px, 1.3): a record row's label, alert titles (at 700), button labels. Consent and compact rows step down to 16px.
- **Body** (400, 16px, 1.5): leads (max 42ch, ink-2) and reading pages (1.6, max 65ch).
- **Body small** (400, 15px, 1.4): row messages and how-it-works lines, notices, field labels (at 600), links (at 500).
- **Label** (600, 12px, 0.06em, uppercase): module tab headers; the frame's zone label at 0.08em.
- **Mono code** (700, clamp(32px, 10vw, 44px)): the one-time-code cells; the "VC-" prefix at 600, clamp(26px, 8vw, 32px), ink-2.
- **Mono meta** (400, 13px, tabular): indices (600), times, masked numbers, URLs, footers (12px), step count and clock (600, 0.04em).
- **Mono state** (600, 12px, 0.06em, uppercase): state words (PENDING, PASSED, FAILED, CHECKING) and tags.

### Named Rules
**The One Mono Grammar Rule.** Every number, code, time, masked identifier, URL and state word is set in JetBrains Mono with tabular figures; words are never set in mono, numbers are never set in Public Sans. Two-digit indices (01–04) and "n / of" step counts, never progress dots.

## Layout

A single column, max 480px, centred, with a 20px page gutter (pinned actions max 440px). On a 1440px desktop the frame bar runs full width and the column stays 480px; nothing reflows into multiple columns. Inside modules the gutter is 12px; modules stack 18px below preceding copy and 12px below another module. Record rows pad 13px (9px tight on consent and compact summaries); option rows are at least 58px tall; tally rows 48px. The only breakpoint is 430px: below it the compact record hides its per-row time (the footer carries the issue time) so the code plate stays in the first screen at 390x844.

The data split is a two-column grid inside a module ("Kept" / "Never kept"), divided by a vertical hairline.

### Named Rules
**The Fixed Thumb Zone Rule.** A screen's primary action is pinned to the bottom with `position: fixed`, over a 16px fade from transparent to the ground, with a 150px spacer at the end of the flow so content clears it. Not `sticky`: the root body's `overflow-x` makes sticky inert. Long forms use the inline action stack instead (12px gap, safe-area padding).

**The One Job Rule.** One H1, one module story, one primary action per screen; steps are counted in the frame ("1 / 6"), not drawn.

## Elevation & Depth

The phone pages are flat. Depth is tonal: the indigo frame sits above the lilac-grey ground, white modules sit on the ground inside 1px lilac rules, and tab headers and footers are tinted bands within a module. No box-shadow anywhere in the phone stylesheet. The only shadow in the system belongs to the extension badge, which floats over a third-party listing page and needs separation from content it does not control (see sidecar).

### Named Rules
**The Flat Secure Zone Rule.** On pages the product owns, no surface casts a shadow; a module is defined by its rule and its tab, not by lift.

## Shapes

Small, office-grade corners: 6px on modules, inputs, alerts, the plate and code cells; 8px on full-width buttons; 4px on state cells, state icons and the paste line; 3px on tags; a full pill only on the connection chip. Borders are 1px hairlines; the paste line alone is dashed, marking "select and copy this". Icons are one stroke family: 20px box, 2px round strokes, currentColor, drawn as inline SVG (check, cross, dashed pending circle, copy, clock).

### Named Rules
**The Slot Mark Rule.** A one-time-code cell carries its underline as an inset mark: a 3px indigo bar with 2px radius, 9px in from each side and 7px up from the bottom, drawn by a pseudo-element inside the rounded cell. Never a thick bottom border on a rounded box, which bends around the corners.

## Components

### Buttons
Full-width, firm, institutional.
- **Shape:** gently squared (8px), 54px minimum height, 17px/600 label, optional leading icon at a 10px gap.
- **Primary:** indigo fill, white label; hover lifts to Raised Indigo; disabled goes Muted Indigo with `not-allowed`; `aria-busy` shows the progress cursor.
- **Secondary:** white fill, 1px indigo stroke, indigo label; hover tints Selected Lilac.
- **Press:** both drop 1px (`translateY(1px)`); colour transitions 160ms on the system ease-out.
- **Links:** indigo, 15px/500, 1px underline offset 3px; the centred link sits under the pinned primary.
- **Focus:** a 3px indigo outline offset 2px everywhere (white on the frame bar).

### Chips
- **Connection chip:** the only pill. Raised Indigo on the frame with a leading 8px status dot and the connection in words ("On mobile data"); turns amber (warn-bg, dark amber text) on Wi-Fi. It is a status cell, so state colour is permitted.
- **Tags:** 12px mono uppercase on Tab Lilac, 3px radius, inline with field notes.

### Cards / Containers (modules)
- **Corner Style:** 6px, `overflow: hidden` so the tab and footer bands clip to it.
- **Background:** Statement White on the Lilac-Grey Ground.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px Hairline Lilac; rows inside divide with Soft Hairline; last row has none.
- **Tab header:** a 34px Tab Lilac band, uppercase label; left the module's name (the H2, in ink, never wrapping), right what happens to its data or who supplies it, in ink-2 ("By your operator", "GDPR · consent", "Public · paste it").
- **Footer:** Faint Lilac band, 12px mono ink-3 for provenance ("via Nokia Network as Code · CAMARA", masked number and issue time) or 14px body for a footnote.

### Inputs / Fields
- **Style:** 52px tall, white, 1px Field Stroke, 6px radius, 17px text; mono variant (16px, 0.04em, tabular) for numbers and IDs; textareas are mono at 15px.
- **Hover:** border darkens to ink-3.
- **Focus:** 3px indigo outline offset 1px and an indigo border.
- **Error:** Refusal Red border and a 15px/500 red message below. Labels 15px/600 above, notes 14px ink-3 below.

### Option rows (report categories)
Ruled rows inside a module: a 22px native radio with indigo accent, 16px/500 label. A checked row fills Selected Lilac and goes bold; focus draws an inset 3px indigo outline around the whole row.

### Navigation (frame bar)
The secure-zone header on every page: product name left, uppercase zone label right ("Secure verification", "Viewing report"); under it the connection chip left and the mono step count right. Once the number is confirmed a 15-minute session clock (clock icon, mm:ss) joins the step count and turns pale amber in its last minute. Safe-area aware top padding.

### The Confirmation Record (signature)
The ruled list every check posts into. Each row is a three-column grid (26px index, flexible label, state): a two-digit mono index, the check's label, and a state cell; under the label, at full width, the API's message verbatim and a mono meta line (time · masked detail). The running check's index and state turn indigo, with a slowly turning dashed ring. On the consent screen nothing has run, so the state is a plain mono word ("PENDING"), not a ring. The **compact** variant summarises a finished record one line per check with an icon-only 28px state square (screen-reader word kept), and hides times under 430px.

**Posting motion:** a result enters like a printed line, a left-to-right `clip-path` wipe from 35% opacity over 460ms, staggered 170ms per row.

### The Code Plate (signature)
The record's last line. A module bordered and tabbed in indigo ("Your code" / "Public · paste it"), then the code: a muted "VC-" prefix and one cell per character (Faint Lilac, Hairline border, 6px, indigo 700 mono, inset slot mark), revealed bottom-up with a 420ms clip, staggered 110ms after a 240ms delay. Below a rule, the paste line in a dashed, select-all mono box (the code never breaks across lines) and a secondary "Copy the line" button; when the clipboard is blocked, the line is selected and a note says so.

### Alerts and notices
Alerts are 6px boxes with a tinted fill and matching 1px border in the state hue (red default, amber warn, green ok), a 17px/700 title in the state ink and a 15px ink body. Notices are neutral Tab Lilac boxes for information that is not a result.

### Motion and reduced motion
The system easing is `cubic-bezier(0.16, 1, 0.3, 1)`. Under `prefers-reduced-motion: reduce`, the post wipe, the cell reveal and the checking ring stop, and button colour transitions are removed.

## Do's and Don'ts

### Do:
- **Do** open every module with an uppercase tab naming its contents on the left and its data handling or source on the right.
- **Do** set every number, code, time, masked identifier and state word in tabular JetBrains Mono.
- **Do** mask personal data in the record (`+40 7•• ••• 001`) and keep the code whole on one line.
- **Do** keep state colour inside state cells, alerts, field errors and the connection/session indicators; pair every colour with a word or an icon with a screen-reader word.
- **Do** pin the primary action with `position: fixed` and a spacer; the root body's `overflow-x` makes `sticky` inert.
- **Do** draw the one-time-code underline as an inset `::after` slot mark inside the rounded cell.
- **Do** honour `prefers-reduced-motion` for the post wipe, the cell reveal and the checking ring.
- **Do** keep strings pinned by tests verbatim (state words "Passed", "Failed", "Checking"; "Proprietar verificat · ChirieSigură VC-XXXX"; API messages shown as returned); change the test and the copy together or not at all.
- **Do** use the 20px, 2px-stroke, currentColor SVG icon family for every icon.

### Don't:
- **Don't** use green, red or amber on headings, buttons, module chrome or decoration.
- **Don't** add a second accent hue or use indigo on idle or finished rows.
- **Don't** lift phone-page modules with shadows or present them as floating white cards on white.
- **Don't** use shield, padlock or check-circle-pop imagery; trust is stated in words in the record.
- **Don't** draw progress dots or fake progress; count steps in mono in the frame and show a ring only while a check is actually running.
- **Don't** put a thick bottom border on a rounded code cell.
- **Don't** use `position: sticky` for the pinned action.
- **Don't** reword verbatim strings pinned by tests or returned by the API.
