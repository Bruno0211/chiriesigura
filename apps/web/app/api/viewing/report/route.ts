import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { REPORT_CATEGORIES, type ReportCategory, type ReportRequest, type ReportResponse } from '@cs/shared';
import { getDb } from '@/lib/db';
import { signedInSub } from '@/lib/auth0';
import { isBarred, landlordStanding, personLandlordIds } from '@/lib/cases';
import { landlord, reportCase, verification, viewingReport } from '@/lib/db/schema';
import { accountHash, phoneHash } from '@/lib/hash';
import { network } from '@/lib/network';
import { readNv } from '@/lib/nv-session';

/** How long a report waits for the operator's SIM-swap answer before filing without it. */
const SIM_SWAP_TIMEOUT_MS = 3000;
const reply = (status: number, body: ReportResponse) => Response.json(body, { status });
const isUniqueViolation = (e: unknown) => /unique|duplicate/i.test(String((e as { cause?: unknown })?.cause ?? e));

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<ReportRequest> | null;
  if (body?.consent !== true || !REPORT_CATEGORIES.includes(body.category as ReportCategory)) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const sub = await signedInSub();
  if (!sub) return reply(401, { ok: false, reason: 'signed_out' });
  const nv = readNv(req);
  if (!nv) return reply(401, { ok: false, reason: 'not_number_verified' });

  const db = getDb();
  const id = body.verificationId;
  const [v] = typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)
    ? await db.select().from(verification).where(and(eq(verification.id, id), isNotNull(verification.verifiedAt)))
    : [];
  if (!v) return Response.json({ error: 'not_found' }, { status: 404 });

  const reporterPhone = phoneHash(nv.e164);
  const reporterAccount = accountHash(sub);
  if (await isBarred(db, { phoneHash: reporterPhone, accountHash: reporterAccount })) return reply(403, { ok: false, reason: 'barred' });

  const owners = await db.select({ hash: landlord.phoneHash }).from(landlord).where(inArray(landlord.id, await personLandlordIds(db, v.landlordId)));
  if (owners.some((o) => o.hash === reporterPhone)) return reply(403, { ok: false, reason: 'own_listing' });

  // Every report, no-show included, needs the reporter to be at the address.
  const radiusM = Number(process.env.LOCATION_RADIUS_M ?? 100);
  const loc = await network().verifyLocation(nv.e164, { lat: v.lat, lng: v.lng, radiusM }).catch(() => null);
  if (loc === null) return reply(503, { ok: false });
  if (loc !== 'TRUE' && loc !== 'PARTIAL') return reply(403, { ok: false, reason: 'not_at_address' });

  // A failed or hung operator call must not block the renter; the warning sign just stays unknown.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const simSwapped = await Promise.race([
    network().simSwapped(nv.e164, 720).catch(() => null),
    new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), SIM_SWAP_TIMEOUT_MS); }),
  ]).finally(() => clearTimeout(timer));

  try {
    await db.transaction(async (tx) => {
      const [r] = await tx.insert(viewingReport).values({
        verificationId: v.id, reporterPhoneHash: reporterPhone, reporterAccountHash: reporterAccount,
        locationResult: loc, category: body.category!, simSwapped,
      }).returning({ id: viewingReport.id });
      if (body.category !== 'ok') await tx.insert(reportCase).values({ reportId: r!.id, landlordId: v.landlordId, status: 'ready' });
    });
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    return reply(409, { ok: false, reason: 'already_reported' });
  }
  return reply(200, { ok: true, counts: (await landlordStanding(db, v.landlordId)).counts });
}
