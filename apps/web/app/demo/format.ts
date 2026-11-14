import type { DemoListing } from '@/lib/demo-listings';

export type FactKind = 'rooms' | 'area' | 'floor';

/** "2 camere · 54 m² · etaj 2/4" → three facts, each with the icon it is shown with. */
export function facts(rooms: string): { kind: FactKind; text: string }[] {
  return rooms.split(' · ').map((text) => ({
    kind: /m²/.test(text) ? 'area' : /etaj|parter/i.test(text) ? 'floor' : 'rooms',
    text,
  }));
}

/** "450 €/lună" → the amount and its period, so the amount can lead. */
export function splitPrice(price: string): { amount: string; per: string } {
  const at = price.indexOf('/');
  return at === -1 ? { amount: price, per: '' } : { amount: price.slice(0, at), per: price.slice(at) };
}

export const priceValue = (price: string): number => Number.parseInt(price.replace(/\D+/g, ' ').trim(), 10) || 0;

export const roomCount = (rooms: string): number => Number.parseInt(rooms, 10) || 1;

/** Unsplash serves any width from the same photo; cards ask for a smaller one. */
export const sized = (url: string, width: number): string => url.replace(/([?&])w=\d+/, `$1w=${width}`);

/** "Postat azi la 09:12" sorts above "Postat azi la 08:30", which sorts above "Postat ieri". */
function postedRank(posted: string): number {
  const time = /azi la (\d{2}):(\d{2})/.exec(posted);
  if (time) return 2000 + Number(time[1]) * 60 + Number(time[2]);
  return /ieri/.test(posted) ? 1000 : 0;
}

export const newestFirst = (listings: DemoListing[]): DemoListing[] =>
  [...listings].sort((a, b) => postedRank(b.posted) - postedRank(a.posted));

/** Diacritics-insensitive, so "timisoara" finds "Timișoara". */
export const fold = (text: string): string =>
  text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export const propertyType = (title: string): string => (/^garsonier/i.test(title) ? 'Garsonieră' : 'Apartament');

export function countLabel(n: number): string {
  if (n === 1) return '1 anunț';
  return n >= 20 ? `${n} de anunțuri` : `${n} anunțuri`;
}

/** "450 €/lună" over "54 m²" reads "8,33 €/m²", the way Romanian portals print it. */
export function pricePerSquareMeter(price: string, rooms: string): string | null {
  const area = /(\d+(?:[.,]\d+)?)\s*m²/.exec(rooms);
  const amount = priceValue(price);
  if (!area || !amount) return null;
  return `${(amount / Number(area[1]!.replace(',', '.'))).toFixed(2).replace('.', ',')} €/m²`;
}

export type SortKey = 'noi' | 'pret-asc' | 'pret-desc';

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'noi', label: 'Cele mai noi' },
  { key: 'pret-asc', label: 'Preț crescător' },
  { key: 'pret-desc', label: 'Preț descrescător' },
];

/** Newest first, then by price when asked; equal prices keep the newest on top. */
export function sortListings(listings: DemoListing[], sort: string): DemoListing[] {
  const newest = newestFirst(listings);
  if (sort === 'pret-asc') return newest.sort((a, b) => priceValue(a.price) - priceValue(b.price));
  if (sort === 'pret-desc') return newest.sort((a, b) => priceValue(b.price) - priceValue(a.price));
  return newest;
}
