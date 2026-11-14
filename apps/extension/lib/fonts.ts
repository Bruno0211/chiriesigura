import { browser } from 'wxt/browser';

/**
 * The phone pages' faces, bundled in public/fonts (SIL OFL, licences beside them): Atkinson Hyperlegible Next
 * for every word and number (from @fontsource-variable/atkinson-hyperlegible-next 5.3.0), JetBrains Mono for codes.
 * Loaded from bytes with the FontFace API, so a listing site's CSP font-src cannot block them.
 */
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
// Carries Romanian ă â î ș ț.
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

const FACES = [
  { family: 'CS Atkinson Next', file: '/fonts/atkinson-hyperlegible-next-latin-wght-normal.woff2', range: LATIN, weight: '200 800' },
  { family: 'CS Atkinson Next', file: '/fonts/atkinson-hyperlegible-next-latin-ext-wght-normal.woff2', range: LATIN_EXT, weight: '200 800' },
  { family: 'CS JetBrains Mono', file: '/fonts/jetbrains-mono-latin-wght-normal.woff2', range: LATIN, weight: '100 900' },
  { family: 'CS JetBrains Mono', file: '/fonts/jetbrains-mono-latin-ext-wght-normal.woff2', range: LATIN_EXT, weight: '100 900' },
] as const;

let loading: Promise<void> | null = null;

export function loadFonts(doc: Document = document): Promise<void> {
  loading ??= Promise.all(
    FACES.map(async (f) => {
      try {
        const bytes = await (await fetch(browser.runtime.getURL(f.file))).arrayBuffer();
        const face = new FontFace(f.family, bytes, { weight: f.weight, unicodeRange: f.range, display: 'swap' });
        doc.fonts.add(await face.load());
      } catch {
        // The badge falls back to the system UI and mono faces.
      }
    }),
  ).then(() => undefined);
  return loading;
}
