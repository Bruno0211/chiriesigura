import { and, eq, isNotNull } from 'drizzle-orm';
import { REPORT_CATEGORIES, type ReportCategory, type ReportRequest, type ReportResponse } from '@cs/shared';
import { getDb } from '@/lib/db';
import { verification, viewingReport } from '@/lib/db/schema';
import { phoneHash } from '@/lib/hash';
import { network } from '@/lib/network';
import { readNv } from '@/lib/nv-session';
import { landlordReportCounts } from '@/lib/queries';

const reply = (status: number, body: ReportResponse) => Response.json(body, { status });
const isUniqueViolation = (e: unknown) => /unique|duplicate/i.test(String((e as { cause?: unknown })?.cause ?? e));

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<ReportRequest> | null;
  if (body?.consent !== true || !REPORT_CATEGORIES.includes(body.category as ReportCategory)) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const nv = readNv(req);
  if (!nv) return reply(401, { ok: false, reason: 'not_number_verified' });

  const db = getDb();
  const id = body.verificationId;
  const [v] = typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)
    ? await db.select().from(verification).where(and(eq(verification.id, id), isNotNull(verification.verifiedAt)))
    : [];
  if (!v) return Response.json({ error: 'not_found' }, { status: 404 });

  // Every report, no-show included, needs the reporter to be at the address.
  const radiusM = Number(process.env.LOCATION_RADIUS_M ?? 2000);
  const loc = await network().verifyLocation(nv.e164, { lat: v.lat, lng: v.lng, radiusM }).catch(() => null);
  if (loc === null) return reply(503, { ok: false });
  if (loc !== 'TRUE' && loc !== 'PARTIAL') return reply(403, { ok: false, reason: 'not_at_address' });

  try {
    await db.insert(viewingReport).values({
      verificationId: v.id, reporterPhoneHash: phoneHash(nv.e164), locationResult: loc, category: body.category!,
    });
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    return reply(409, { ok: false, reason: 'already_reported' });
  }
  return reply(200, { ok: true, counts: await landlordReportCounts(db, v.landlordId) });
}
