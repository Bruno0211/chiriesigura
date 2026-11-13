import { eq } from 'drizzle-orm';
import type { LocationRequest, LocationResponse } from '@cs/shared';
import { getDb } from '@/lib/db';
import { verification } from '@/lib/db/schema';
import { ownVerification } from '@/lib/landlord-auth';
import { CHECK_ERROR, network } from '@/lib/network';

const NOT_NEAR = "Your phone isn't near this address. Open this page at the apartment, on mobile data.";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<LocationRequest> | null;
  const db = getDb();
  const own = await ownVerification(db, req, body?.verificationId);
  if (own instanceof Response) return own;
  const { verification: v, e164 } = own;

  const radiusM = Number(process.env.LOCATION_RADIUS_M ?? 2000);
  const result = await network().verifyLocation(e164, { lat: v.lat, lng: v.lng, radiusM }).catch(() => null);
  if (result === null) {
    return Response.json({ ok: false, step: { name: 'location', ok: false, message: CHECK_ERROR } } satisfies LocationResponse);
  }
  if (result !== 'TRUE' && result !== 'PARTIAL') {
    // The latest check says the phone isn't there, so an earlier pass no longer allows listings.
    await db.update(verification).set({ locationCheckedAt: null }).where(eq(verification.id, v.id));
    return Response.json({ ok: false, step: { name: 'location', ok: false, message: NOT_NEAR } } satisfies LocationResponse);
  }
  await db.update(verification).set({ locationResult: result, locationCheckedAt: new Date() }).where(eq(verification.id, v.id));
  const message = result === 'TRUE' ? 'Your phone is at the address' : 'Your phone is near the address';
  return Response.json({ ok: true, step: { name: 'location', ok: true, message } } satisfies LocationResponse);
}
