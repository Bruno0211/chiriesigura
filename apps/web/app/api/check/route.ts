import {
  badgeLabel, decideBadge, emptyCounts, findCode, normalizeRoPhone, REPORT_CATEGORIES,
  type CheckResponse, type ListingRef, type Site,
} from '@cs/shared';
import { isSignedIn } from '@/lib/auth0';
import { getDb } from '@/lib/db';
import { phoneHash } from '@/lib/hash';
import { listingFarFrom, type LatLng } from '@/lib/listing-area';
import { findVerificationByCode, landlordReportCounts } from '@/lib/queries';

const SITES: Site[] = ['olx', 'storia', 'imobiliare', 'demo'];
const CORS = { 'Access-Control-Allow-Origin': '*' };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' } });
}

const MAX_PLACE_CHARS = 200;

/** The page's own place name, or null when missing or too long to be one. */
function placeText(raw: string | null): string | null {
  const t = raw?.trim() ?? '';
  return t && t.length <= MAX_PLACE_CHARS ? t : null;
}

/** Page coordinates only when both parse to a real point on Earth. */
function placeCoords(lat: string | null, lng: string | null): LatLng | null {
  if (!lat || !lng) return null;
  const p = { lat: Number(lat), lng: Number(lng) };
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180 ? p : null;
}

export async function GET(req: Request) {
  if (!(await isSignedIn())) return Response.json({ error: 'signed_out' }, { status: 401, headers: CORS });
  const q = new URL(req.url).searchParams;
  const site = q.get('site') as Site | null;
  const listingId = q.get('listingId');
  const listing: ListingRef | null = site && SITES.includes(site) && listingId ? { site, listingId } : null;
  const code = findCode(q.get('code') ?? '');
  const phone = normalizeRoPhone(q.get('phone') ?? '');

  const db = getDb();
  const v = code ? await findVerificationByCode(db, code) : null;
  const reports = v ? await landlordReportCounts(db, v.landlordId) : emptyCounts();
  const listingFar = v ? await listingFarFrom({ text: placeText(q.get('place')), coords: placeCoords(q.get('placeLat'), q.get('placeLng')) }, v) : false;
  const status = decideBadge({ listing, code, verification: v, pagePhoneHash: phone ? phoneHash(phone) : null, reports, listingFar });

  const body: CheckResponse = { status, label: badgeLabel(status, v?.verifiedAt, v?.city) };
  if (v && (status === 'green' || status === 'amber')) {
    Object.assign(body, { verificationId: v.id, verifiedAt: v.verifiedAt, locationResult: v.locationResult });
    if (v.city) body.city = v.city;
    if (REPORT_CATEGORIES.some((k) => reports[k] > 0)) body.reports = reports;
  }
  return Response.json(body, { headers: CORS });
}
