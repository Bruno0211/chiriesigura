import {
  badgeLabel, decideBadge, emptyCounts, findCode, normalizeRoPhone, REPORT_CATEGORIES,
  type CheckResponse, type ListingRef, type Site,
} from '@cs/shared';
import { getDb } from '@/lib/db';
import { phoneHash } from '@/lib/hash';
import { findVerificationByCode, landlordReportCounts } from '@/lib/queries';

const SITES: Site[] = ['olx', 'storia', 'imobiliare', 'demo'];
const CORS = { 'Access-Control-Allow-Origin': '*' };

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET' } });
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const site = q.get('site') as Site | null;
  const listingId = q.get('listingId');
  const listing: ListingRef | null = site && SITES.includes(site) && listingId ? { site, listingId } : null;
  const code = findCode(q.get('code') ?? '');
  const phone = normalizeRoPhone(q.get('phone') ?? '');

  const db = getDb();
  const v = code ? await findVerificationByCode(db, code) : null;
  const reports = v ? await landlordReportCounts(db, v.landlordId) : emptyCounts();
  const status = decideBadge({ listing, code, verification: v, pagePhoneHash: phone ? phoneHash(phone) : null, reports });

  const body: CheckResponse = { status, label: badgeLabel(status, v?.verifiedAt) };
  if (v && (status === 'green' || status === 'amber')) {
    Object.assign(body, { verificationId: v.id, verifiedAt: v.verifiedAt, locationResult: v.locationResult });
    if (REPORT_CATEGORIES.some((k) => reports[k] > 0)) body.reports = reports;
  }
  return Response.json(body, { headers: CORS });
}
