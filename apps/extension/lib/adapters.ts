import type { Site } from '@cs/shared';
import { MatchPattern } from 'wxt/utils/match-patterns';

/** Where a listing site keeps the parts of the page the badge reads. */
export interface SiteAdapter {
  site: Site;
  /** Extension match patterns (no port: match patterns cannot carry one). */
  matches: string[];
  /** The listing's own description. Codes anywhere else (similar listings, other ads) are ignored. */
  descriptionSelector: string;
  /** The landlord's phone once it is shown on the page. */
  phoneSelector?: string;
}

export const ADAPTERS: SiteAdapter[] = [
  {
    site: 'olx',
    matches: ['*://*.olx.ro/*'],
    descriptionSelector: '[data-cy="ad_description"], [data-testid="ad_description"]',
    // OLX hides the number behind "Arată"; this link only exists once it is revealed.
    phoneSelector: '[data-testid="contact-phone"]',
  },
  {
    // Stretch: Storia shares OLX Group's ad page markup.
    site: 'storia',
    matches: ['*://*.storia.ro/*'],
    descriptionSelector: '[data-cy="adPageAdDescription"]',
  },
];

/** The app's own demo listing pages (plan Task 13 markup), on whichever host the app runs. */
export function demoAdapter(appUrl: string): SiteAdapter {
  const { protocol, hostname } = new URL(appUrl);
  return {
    site: 'demo',
    matches: [`${protocol}//${hostname}/demo/listing/*`],
    descriptionSelector: '[data-testid="description"]',
    phoneSelector: '[data-testid="phone"]',
  };
}

export function findAdapter(url: string, appUrl: string): SiteAdapter | null {
  return (
    [...ADAPTERS, demoAdapter(appUrl)].find((a) => a.matches.some((m) => new MatchPattern(m).includes(url))) ?? null
  );
}
