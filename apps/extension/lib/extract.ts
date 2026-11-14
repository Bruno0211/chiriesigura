import { findCode, parseListingUrl, type ListingRef } from '@cs/shared';
import type { SiteAdapter } from './adapters';

export interface Extracted {
  listing: ListingRef | null;
  code: string | null;
  /** As shown on the page; the server normalises and hashes it, and never stores it. */
  phone: string | null;
  /** Where the page says the flat is, as shown; the server looks it up and never stores it. */
  place: string | null;
  placeCoords: { lat: number; lng: number } | null;
}

/** Elements that sit inside a line of text; every other element (p, div, li, br, …) breaks the line. */
const INLINE = new Set(['A', 'ABBR', 'B', 'BDI', 'BDO', 'CITE', 'CODE', 'DATA', 'DFN', 'EM', 'I', 'KBD', 'MARK', 'Q', 'S', 'SAMP', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUP', 'TIME', 'U', 'VAR', 'WBR']);

/**
 * The text as a reader sees its lines. textContent glues `VC-7K3Q<br>Preț` into `VC-7K3QPreț` (code lost)
 * and `<p>VC-7K3</p><p>Q…` into `VC-7K3Q` (code invented); this breaks at <br> and block boundaries instead.
 */
function lineText(el: Element): string {
  let out = '';
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === 3) out += (child as Text).data;
      else if (child.nodeType === 1) {
        const inline = INLINE.has((child as Element).tagName.toUpperCase());
        if (!inline) out += '\n';
        walk(child);
        if (!inline) out += '\n';
      }
    }
  };
  walk(el);
  return out;
}

/** Reads only what the student is already looking at: the listing URL, its description and the visible phone. */
export function extractFromDocument(doc: Document, url: string, adapter: SiteAdapter, demoOrigin: string): Extracted {
  const description = doc.querySelector(adapter.descriptionSelector);
  const phoneText = adapter.phoneSelector ? doc.querySelector(adapter.phoneSelector)?.textContent?.trim() : null;
  const placeEl = adapter.placeSelector ? doc.querySelector(adapter.placeSelector) : null;
  const place = placeEl ? lineText(placeEl).split('\n').map((l) => l.trim()).filter(Boolean).join(', ') : '';
  return {
    listing: parseListingUrl(url, demoOrigin),
    code: description ? findCode(lineText(description)) : null,
    phone: phoneText || null,
    place: place || null,
    placeCoords: adapter.placeCoords?.(doc) ?? null,
  };
}

/** A badge belongs on a listing page, or on any page whose description carries a code (spec §6.2 rule 1). */
export const isListingPage = (e: Extracted): boolean => e.listing !== null || e.code !== null;
