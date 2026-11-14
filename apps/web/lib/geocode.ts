/** The demo apartment (Task 13's demo listings point here). Matching is case- and whitespace-insensitive. */
export const DEMO_APARTMENT = 'Strada Alba Iulia 2, Timișoara';

export interface Geocoded { lat: number; lng: number; city: string | null }

export const DEMO_ADDRESSES: Record<string, Geocoded> = {
  [DEMO_APARTMENT]: { lat: 45.7537, lng: 21.2257, city: 'Timișoara' },
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

type Hit = { lat: string; lon: string; address?: { city?: string; town?: string; village?: string } };

export async function geocode(address: string, timeoutMs = 10_000): Promise<Geocoded | null> {
  const demo = Object.entries(DEMO_ADDRESSES).find(([k]) => norm(k) === norm(address));
  if (demo) return demo[1];
  // A plain timer (not AbortSignal.timeout) so tests can drive it with fake timers.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=ro&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ChirieSigura-hackathon' }, signal: abort.signal });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as Hit[];
    if (!hit) return null;
    const a = hit.address;
    return { lat: Number(hit.lat), lng: Number(hit.lon), city: a?.city ?? a?.town ?? a?.village ?? null };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
