---
name: ChirieSigură
description: Verification as a short tram ride; each stop lights up as the mobile operator answers, and the issued code is the destination sign.
colors:
  line: "#1f4fd6"
  line-hi: "#1a43b8"
  line-tint: "#eef2fd"
  line-soft: "#dfe5f7"
  line-mute: "#33427a"
  line-select: "#cfdafa"
  on-line: "#dbe4fb"
  ink: "#141414"
  ink-2: "#4b4f58"
  ink-3: "#6a6f7a"
  surface: "#ffffff"
  ground: "#f2f3f5"
  rule: "#e2e4e9"
  track: "#cdd1d8"
  field: "#8a909b"
  ok: "#13804b"
  ok-ink: "#0f6f41"
  ok-bg: "#e7f4ed"
  ok-edge: "#b9dcc8"
  fail: "#c4291c"
  fail-bg: "#fdeceb"
  fail-edge: "#f3c4bf"
  warn: "#8a4f00"
  warn-dot: "#d08700"
  warn-bg: "#fdf1d8"
  warn-edge: "#efd49c"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  brand:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  stop:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: 1.3
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  body-small:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.4
  state-word:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.3
  button:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.25
  code-cell:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "clamp(34px, 11vw, 48px)"
    fontWeight: 700
    lineHeight: 1
  code-line:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  badge-body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
rounded:
  focus: "4px"
  terminus: "7px"
  mark-sm: "8px"
  mark: "10px"
  md: "12px"
  button: "14px"
  lg: "16px"
  pill: "999px"
spacing:
  hair: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  gutter: "20px"
  section: "22px"
  route-indent: "40px"
  column: "480px"
components:
  button-primary:
    backgroundColor: "{colors.line}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "14px 20px"
    height: "56px"
    width: "100%"
  button-primary-hover:
    backgroundColor: "{colors.line-hi}"
    textColor: "{colors.surface}"
  button-primary-disabled:
    backgroundColor: "{colors.line-soft}"
    textColor: "{colors.line-mute}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.line}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "14px 20px"
    height: "56px"
    width: "100%"
  button-secondary-hover:
    backgroundColor: "{colors.line-tint}"
    textColor: "{colors.line}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "13px 14px"
    height: "54px"
  chip:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
    height: "32px"
  chip-wifi:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
  brand-mark:
    backgroundColor: "{colors.line}"
    textColor: "{colors.surface}"
    rounded: "{rounded.mark}"
    size: "38px"
  module:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 16px 16px"
  stop-disc:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "22px"
  stop-disc-passed:
    backgroundColor: "{colors.ok}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "22px"
  destination-sign:
    backgroundColor: "{colors.line}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px 16px 18px"
  code-cell:
    backgroundColor: "{colors.line-hi}"
    textColor: "{colors.surface}"
    typography: "{typography.code-cell}"
    rounded: "{rounded.mark}"
    width: "clamp(44px, 14vw, 60px)"
    height: "clamp(58px, 18vw, 76px)"
  paste-line:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.code-line}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  state-pill-passed:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok-ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px 3px 8px"
    height: "28px"
  state-pill-failed:
    backgroundColor: "{colors.fail-bg}"
    textColor: "{colors.fail}"
    rounded: "{rounded.pill}"
    padding: "3px 10px 3px 8px"
    height: "28px"
  alert-fail:
    backgroundColor: "{colors.fail-bg}"
    textColor: "{colors.fail}"
    rounded: "{rounded.button}"
    padding: "14px 16px"
  alert-warn:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn}"
    rounded: "{rounded.button}"
    padding: "14px 16px"
  alert-ok:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok-ink}"
    rounded: "{rounded.button}"
    padding: "14px 16px"
  badge-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.badge-body}"
    rounded: "{rounded.lg}"
    width: "min(360px, calc(100vw - 32px))"
  badge-button-primary:
    backgroundColor: "{colors.line}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
    height: "44px"
---

# Design System: ChirieSigură

## Overview

**Creative North Star: "Tram Line"**

Verification is a short ride with a few stops. The check record is drawn as a vertical tram-line diagram: a 6 px line, white stop discs with a thick ring, a rounded-square terminus. Stops light up as the mobile operator answers, a small marker travels down the segment while a request is in flight, and the ride ends at a destination sign: a cobalt plate carrying the issued code in large white monospaced cells. The same world, at badge scale, floats on third-party listing pages as the extension badge.

The page is white and calm. One line colour, cobalt, carries everything that moves you along: the route, the active stop, primary actions, links, focus and the "VC" line badge that is the product's mark. Secondary blocks are flat cool-grey slabs with generous radii. State colour (green, red, amber) is quarantined to the places that report state, so a glance at any screen tells you where the ride stands. Everything is set in Atkinson Hyperlegible Next with tabular figures, sized to read off a projector; the monospace face appears only where a code is shown.

The world deliberately replaces an earlier bank-statement frame (indigo bar, lilac ground, uppercase tab headers, monospace everywhere). It is friendly and modern without being playful: no dark surfaces, no decorative gradients, no glass, no purple, no emoji. The `/demo` listings portal ("Anunțuri Timiș") is a fictional third-party stage prop and sits outside this system.

**Key Characteristics:**
- White page, flat cool-grey blocks, one cobalt line colour.
- The record is a route diagram: discs on a line, a terminus, then the destination sign.
- State colour only on stop discs, state words, alerts and the connection chip.
- Atkinson Hyperlegible Next for every word and number; JetBrains Mono only for codes.
- Flat on the phone; the extension badge is the single floating, shadowed surface.
- One authored moment: stops lighting up in sequence like a passing tram; all motion off under reduced motion.

## Colors

A single saturated cobalt on white and cool grey, with three quarantined state hues.

### Primary
- **Line Cobalt** (line): the route line, the active and planned stop rings, the running state word, primary buttons, secondary button strokes, links, list markers, focus rings, the caret, the "VC" brand mark and the destination sign.
- **Deep Cobalt** (line-hi): primary button hover and the code cells set into the destination sign.
- **Cobalt Wash** (line-tint): secondary button hover and the selected report option.
- **Cobalt Haze / Cobalt Slate** (line-soft / line-mute): the disabled primary button's fill and text; the disabled secondary's stroke and text.
- **Sign Ink** (on-line): secondary text on the cobalt sign (the "VC-" prefix, the issue line, the sign's right-hand note).
- **Selection Blue** (line-select): text selection on both phone pages and badge.

### Neutral
- **Ink** (ink): headings, stop labels, body text on grey blocks.
- **Graphite** (ink-2): leads, stop messages, prose, URLs.
- **Slate Grey** (ink-3): meta lines, tab notes, waiting state words, unreached stop labels, placeholders.
- **White** (surface): the page, stop disc centres, inputs, the pinned action bar, the badge card.
- **Platform Grey** (ground): every secondary block (modules, the consent data block, chips, the paste line, skeletons).
- **Rule Grey** (rule): row dividers, the action bar's top edge, the badge's 1 px border.
- **Track Grey** (track): the line ahead, waiting stop rings, the dashed broken line, the badge scrollbar.
- **Field Grey** (field): the 1.5 px input stroke at rest.

### State (quarantined)
- **Passed Green** (ok): filled passed discs and their drawn check, "Passed" words on white, the cellular dot.
- **Passed Ink** (ok-ink): success text on tints and on grey blocks (passed pills, ok alert titles, the badge's ok status line, the "All good" drawn check).
- **Failed Red** (fail): failed disc rings and crosses, "Failed" words, field errors, invalid input strokes, fail alerts.
- **Caution Amber** (warn on warn-bg, with warn-dot): the Wi-Fi connection chip, the session clock's last minute, warn alerts and the badge's amber status.
- **Tints and edges** (ok-bg / fail-bg / warn-bg with ok-edge / fail-edge / warn-edge): alert grounds with their 1 px borders, state pills, badge status lines.

### Named Rules
**The One Line Rule.** Cobalt means "the route and how you move along it": line, active stop, actions, links, focus, brand mark. It never signals pass or fail, and no second accent hue exists.

**The Quarantine Rule.** Green, red and amber appear only on stop discs, state words and pills, alerts, the badge status line and the connection or clock chip. Never on buttons, headings, blocks or the brand.

**The Tint Ink Rule.** Passed Green (ok) sits on white or fills a disc; on any tint or grey block, success text drops to Passed Ink (ok-ink) to hold AA contrast.

## Typography

**Body Font:** Atkinson Hyperlegible Next (latin + latin-ext for ă â î ș ț; system-ui fallback). In the extension it is loaded from bundled bytes through FontFace as "CS Atkinson Next" so a listing site's CSP cannot block it.
**Code Font:** JetBrains Mono (ui-monospace fallback; "CS JetBrains Mono" in the extension).

**Character:** One humanist, legibility-first family does all the talking, at heavy weights (700/800) for anything you must find at a glance; the monospace face is reserved for the one thing that must be copied exactly.

### Hierarchy
- **Display** (800, 34px, 1.05, -0.02em, balanced): the page H1, one per screen.
- **Brand** (800, 18px): "ChirieSigură" beside the VC mark (15px in the badge).
- **Stop** (700, 17px, 1.3): stop labels, the terminus label, alert titles; 16px in a compact finished record.
- **Title** (800, 16px, 1.3): block and record headings ("Your checks", "Your code"); 14px in the badge.
- **Body** (400, 16px, 1.5, tabular figures): page text; prose at 1.6 capped at 65ch, leads capped at 42ch.
- **Body small** (400, 15px, 1.4): stop messages, notices, alert bodies, links.
- **Meta** (600, 13px): headers' right-hand notes, times, footers, in Slate Grey.
- **State word** (700, 13px): Passed / Failed / Checking / Waiting beside each stop, in its state colour.
- **Button** (700, 17px, 1.25); 15px in the badge.
- **Code cell** (JetBrains Mono 700, clamp(34px, 11vw, 48px), 1): the issued code, the largest type on any screen, readable across a room; the "VC-" prefix at clamp(24px, 7vw, 30px) in Sign Ink.
- **Code line** (JetBrains Mono 400, 15px, 1.45): the paste line; quoted codes inline at 700; the badge's read listing code at 12px/600.

### Named Rules
**The Word Face Rule.** Every word and number, including phone numbers, ID series and countdowns, is Atkinson with tabular figures (numeric inputs add 0.04em tracking). Monospace is for issued codes only: the plate cells, "VC-", the paste line, and a code quoted on a page or read from a listing.

**The Sentence Case Rule.** Headings and labels are sentence case at weight, never uppercase-tracked tab headers or small labels above headings.

## Layout

A single phone column: max 480px, 20px gutters, 18px top padding under a white header. Blocks stack with 20px before the first module and 12px between modules; the record sits 22px below the lead. Block interiors pad 16px horizontally. Rows inside blocks are divided by 1px Rule Grey lines, the first row after a heading undivided.

The route diagram indents stop text 40px; the line's centre runs 14px in from the column edge, discs are 22px with their centre on the line, and each stop carries 16px below it (12px compact). On the done screen the last segment runs 26px past the final stop into the destination sign.

The primary action is pinned to the thumb zone with `position: fixed` (not sticky: the root body's overflow-x makes sticky inert), on white with a 1px top rule, content capped at 440px, with a 140px spacer at the end of the page so nothing hides under it. Below 430px the compact record drops its time column so the code stays in the first viewport.

The extension badge is fixed 16px from the top right of the host page, min(360px, 100vw − 32px) wide, with its panel scrolling inside max-height 100vh − 32px; in the popup it is static and full width at 360px.

## Elevation & Depth

The phone pages are flat. Depth is tonal: white page, cool-grey blocks, cobalt sign. The only shadow in the system belongs to the extension badge, because it floats over a third-party page it does not control; in popup mode even that is removed.

### Shadow Vocabulary
- **Floating badge** (`box-shadow: 0 12px 32px rgb(20 20 20 / 0.16), 0 2px 6px rgb(20 20 20 / 0.1)`): the badge card on listing pages, and nowhere else.

### Named Rules
**The Floating Card Rule.** A drop shadow is reserved for the badge on third-party pages. Phone surfaces never lift; the selected report option's inset 2px cobalt ring is a border device, not elevation.

## Shapes

Soft, rounded rectangles with one circle family. Blocks and the sign round at 16px; buttons, alerts and the consent block at 14px; inputs, notices and the paste line at 12px (the badge uses 12px for its blocks and buttons too). The VC mark and code cells are 10px-rounded squares (8px for the badge's 30px mark), and the terminus is a 26px square at 7px, the one non-circular stop. Chips and state pills are full pills. Stop discs are circles with a 5px ring (4px for failed, 16px discs with 4px rings in the badge's mini diagram). The line itself is 6px with 3px round ends (4px in the badge); a broken line is 6px-on, 6px-off dashes with square ends.

Icons are one drawn stroke family: 20px box, 2px round strokes, currentColor, inline SVG (check, cross, alert, clock, copy, arrow, retry, chevron, the dotted "checking" ring and the ring-with-dash).

## Components

### Buttons
Full-width, tall, confident, and always cobalt.
- **Shape:** gently rounded (14px; 12px in the badge).
- **Primary:** Line Cobalt fill, white 17px/700 text, min-height 56px (44px in the badge), optional leading 20px icon.
- **Hover / Active:** fill deepens to Deep Cobalt over 160ms ease-out; press nudges 1px down. Focus is the global 3px cobalt outline at 2px offset.
- **Secondary:** white with a 2px cobalt stroke and cobalt text; hover washes to Cobalt Wash.
- **Disabled:** Cobalt Haze fill (or stroke) with Cobalt Slate text.
- **Text links:** cobalt 15px/700, underlined 1.5px at 3px offset; centred links sit under pinned actions.

### Chips
- **Style:** Platform Grey pill, 32px tall, 14px/700 ink, an 8px status dot.
- **State:** the connection chip's dot is green on mobile data; on Wi-Fi the whole chip turns amber (warn on warn-bg, warn-dot). The session clock chip turns amber in its last minute.

### Cards / Containers
- **Corner Style:** 16px (12px in the badge).
- **Background:** Platform Grey on the white page; no border, no shadow.
- **Heading row:** a 16px/800 title left, a 13px/600 Slate Grey note right, baseline-aligned.
- **Internal Padding:** 10px 16px 16px; list rows 12px 16px with Rule Grey dividers.

### Inputs / Fields
- **Style:** white, 1.5px Field Grey stroke, 12px radius, min-height 54px, 17px text; label 15px/700 above, 6px gap.
- **Focus:** stroke turns cobalt with a 3px cobalt outline at 1px offset. Hover darkens the stroke to Graphite.
- **Error:** Failed Red stroke and a 15px/700 red message.
- **Choices:** report options are 56px rows with 22px cobalt-accented radios; the checked row gets Cobalt Wash and an inset 2px cobalt ring.

### Navigation
- **Header:** white, no bar fill. The 38px cobalt "VC" line badge, "ChirieSigură" beside it, and the step count ("Stop n of 6") or page name right-aligned in 14px/700 Graphite; the connection chip and session clock below.

### The Route (signature component)
The check record as a line diagram. Stop states: **waiting** (white disc, grey ring, grey line ahead, "Waiting" in Slate Grey); **checking** (cobalt ring, "Checking" in cobalt, a 10px cobalt marker travelling down the grey segment above it on a 1.8s loop); **passed** (filled green disc with a drawn white check, cobalt segment behind it, "Passed" in green); **failed** (white disc, 4px red ring and red cross, "Failed" in red); **not reached** (after a failure every later segment is grey dashes and the label drops to Slate Grey; the word "Not checked" is screen-reader only). The terminus is a rounded square: cobalt when reached, grey-ringed ahead, dashed-grey after a failure. As results post, discs scale from 0.6 over 560ms ease-out, staggered 180ms, and the check draws in over 420ms.

### The Destination Sign (signature component)
A Line Cobalt plate (16px radius) headed "Your code", with the code in Deep Cobalt cells of large white JetBrains Mono behind a Sign Ink "VC-" prefix, and the masked number and issue time beneath. Below it, the paste line in a selectable grey mono box (the code kept unbroken) and the primary "Copy the line".

### State Pills and Alerts
- **Pills:** 28px pills, 13px/700, a 16px drawn icon; passed is ok-ink on ok-bg, failed is fail on fail-bg.
- **Alerts:** 14px-radius tinted boxes with a 1px matching edge, a 17px/700 title in the state colour and a 15px ink body.

### Extension Badge
The same world at badge scale: a white card with a 1px Rule Grey border and the floating shadow, a header with the 30px VC mark and a chevron, then the status line, the one place state colour lives: a 30px state disc (green, amber or red with a drawn mark; the dotted ring turning in cobalt while checking; a grey ring-with-dash when there is nothing to vouch for) on the matching tint, a 16px/800 lead and a 13px Graphite line. The panel holds grey modules, the listing's checks as a mini line diagram (16px discs, 4px line, cobalt where passed), report lines, the QR to report a viewing, and cobalt buttons.

## Do's and Don'ts

### Do:
- **Do** use Line Cobalt (#1f4fd6) for the route, the active stop, every primary action, links, focus rings and the VC brand mark, and nothing else.
- **Do** keep green, red and amber on stop discs, state words, pills, alerts, the badge status line and the connection or clock chip only; use Passed Ink (#0f6f41) for success text on any tint.
- **Do** pair every state colour with its word and a drawn mark; keep the pinned strings verbatim: Passed / Failed / Checking / Waiting, "Use mobile data, not Wi-Fi", "Proprietar verificat · ChirieSigură VC-XXXX".
- **Do** leave unreached stops on the dashed grey line with an sr-only "Not checked" rather than a visible state.
- **Do** set every word and number in Atkinson Hyperlegible Next with tabular figures, and reserve JetBrains Mono for issued codes.
- **Do** show the "all good" report category as the drawn check beside the words "all good" / "All good".
- **Do** pin the primary action with position: fixed and a bottom spacer.
- **Do** switch off every animation and transition under prefers-reduced-motion, parking the in-flight marker halfway down its segment.

### Don't:
- **Don't** use a colour emoji or icon glyph anywhere; icons are the 20px, 2px-stroke drawn SVG family.
- **Don't** give the code plate cells an underline or an input look; the sign is a sign, not a field.
- **Don't** reuse the dotted "checking" ring as the unverified mark; unverified is the closed ring with a dash.
- **Don't** put a drop shadow on any phone surface; the extension badge on third-party pages is the only floating card.
- **Don't** fill surfaces with decorative gradients, glass or dark themes; gradients exist only as the drawing technique of the route's dashed and travelling-marker segments.
- **Don't** bring back the discarded frame: no indigo bar, lilac ground, uppercase tab headers or monospace body text.
- **Don't** use position: sticky for the pinned action; it is inert under the root body's overflow-x.
- **Don't** apply this system to the /demo listings portal; it plays a third-party site on purpose.
