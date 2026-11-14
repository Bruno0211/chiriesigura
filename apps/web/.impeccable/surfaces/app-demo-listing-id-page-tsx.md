---
version: 1
slug: "app-demo-listing-id-page-tsx"
primary_target: "app/demo/listing/[id]/page.tsx"
related_targets: ["app/demo/page.tsx","app/demo/layout.tsx"]
---

# Surface brief: demo listings platform (/demo, /demo/listing/[id])

**Scope and mode:** `apps/web/app/demo/`, a fictional regional classifieds portal, "Anunțuri Timiș", that the ChirieSigură extension badges during the pitch. **Operate** (browse a marketplace). Desktop-first (a laptop browser mirrored to a projector), responsive down to 390 px. Code-led. It is a stage prop for a third-party site, so it deliberately sits outside ChirieSigură's DESIGN.md.

**Audience and job:** UniHack judges watching a student browse rentals; they must recognise a big, real listings platform at a glance and then notice the badge. Benchmarks the user named: OLX and Storia / imobiliare.ro. Match their craft, never their branding.

**Proof and constraints:** Romanian page copy (`lang="ro"`), honest "Pagină demo" marker on every page. Extension hooks are fixed: `[data-testid="description"]` holds the listing text (and its pasted code), `[data-testid="phone"]` holds the visible phone, the URL stays `/demo/listing/<id>`, and the "similar listings" widget (with decoy code VC-ZZZZ) stays outside the description. Keep `data-testid` title, price, similar. Phone stays visible (no "Arată" gate). Listing data lives in `lib/demo-listings.ts`; `seed.test.ts` pins d5's last description line. The badge floats fixed top-right (16 px, 360 px wide) over whatever is there. Unsplash photos only (7 verified ids).

**Unresolved:** none.

## Direction contract

THESIS: A believable regional classifieds portal built to OLX / Storia craft, photo-led and dense with real listing facts, so the badge lands on a page that looks like where rental scams actually happen. Refuses the bare demo page and refuses copying any real portal's branding.

OWN-WORLD: Anunțuri Timiș, "the city of roses" portal: white header with a deep-rose wordmark and rose "Adaugă anunț" action; cool light-grey ground; white 12 px panels on 1 px soft rules; Figtree for everything, prices at 800 with tabular figures; ink near-black; rose reserved for brand, primary actions and the saved-heart; drawn 1.8 px line icons for facts; real photography and a real OpenStreetMap location map.

STORY: The judge lands on "Apartamente de închiriat în Timiș", scans six photo cards (one cheaper twin of another, one in Lugoj), opens a listing, and sees a full listing page (gallery, price, facts, owner, description, map, safety tips, similar ads) with the ChirieSigură badge on top.

FIRST VIEWPORT: Listing at 1440×900: thin demo strip, header (wordmark, search field, Favorite / Mesaje / Contul meu, rose Adaugă anunț), breadcrumb, then a 2:1 split: left a photo mosaic (hero + two stacked thumbs, photo count chip), right a summary panel with posted time, title, big price, fact chips, owner card with visible phone and "Trimite mesaj". Results at 1440×900: header, search hero band with filters (category, city, price, rooms), count and sort row, horizontal photo cards in a 2/3 column, right rail with safety tips and a publish-your-ad card; the search filters really filter.

FORM: The category canon, pinned by the user ("look like a big listings platform"), benchmarks OLX + Storia / imobiliare.ro, executed at full fidelity; the user's pin outranks the roll. seed: 5692cb31b7082067. Signature interaction: photo-led cards whose image eases into a slight zoom on hover and a "Salvează" heart that toggles saved state.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
