/** The demo apartment (Task 13's demo listings point here). Matching is case- and whitespace-insensitive. */
export const DEMO_APARTMENT = 'Strada Alba Iulia 2, Timișoara';

export const DEMO_ADDRESSES: Record<string, { lat: number; lng: number }> = {
  [DEMO_APARTMENT]: { lat: 45.7537, lng: 21.2257 },
};

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const demo = Object.entries(DEMO_ADDRESSES).find(([k]) => norm(k) === norm(address));
  if (demo) return demo[1];
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ro&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'ChirieSigura-hackathon' } });
    if (!res.ok) return null;
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  } catch {
    return null;
  }
}
