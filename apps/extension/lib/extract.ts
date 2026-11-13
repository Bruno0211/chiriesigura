import { findCode, parseListingUrl, type ListingRef } from '@cs/shared';
import type { SiteAdapter } from './adapters';

export interface Extracted {
  listing: ListingRef | null;
  code: string | null;
  /** As shown on the page; the server normalises and hashes it, and never stores it. */
  phone: string | null;
}

/** Reads only what the student is already looking at: the listing URL, its description and the visible phone. */
export function extractFromDocument(doc: Document, url: string, adapter: SiteAdapter, demoOrigin: string): Extracted {
  const description = doc.querySelector(adapter.descriptionSelector);
  const phoneText = adapter.phoneSelector ? doc.querySelector(adapter.phoneSelector)?.textContent?.trim() : null;
  return {
    listing: parseListingUrl(url, demoOrigin),
    code: description ? findCode(description.textContent ?? '') : null,
    phone: phoneText || null,
  };
}

/** A badge belongs on a listing page, or on any page whose description carries a code (spec §6.2 rule 1). */
export const isListingPage = (e: Extracted): boolean => e.listing !== null || e.code !== null;
