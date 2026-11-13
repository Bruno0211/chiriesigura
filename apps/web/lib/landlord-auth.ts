import { eq } from 'drizzle-orm';
import type { Db } from './db';
import { landlord, verification } from './db/schema';
import { phoneHash } from './hash';
import { readNv } from './nv-session';

/** The verification, if the number-verified phone on this request owns it; otherwise an error Response. */
export async function ownVerification(db: Db, req: Request, verificationId: unknown) {
  const nv = readNv(req);
  if (!nv) return Response.json({ error: 'not_number_verified' }, { status: 401 });
  if (typeof verificationId !== 'string' || !/^[0-9a-f-]{36}$/i.test(verificationId)) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }
  const [row] = await db
    .select({ v: verification, phoneHash: landlord.phoneHash })
    .from(verification)
    .innerJoin(landlord, eq(landlord.id, verification.landlordId))
    .where(eq(verification.id, verificationId));
  if (!row) return Response.json({ error: 'not_found' }, { status: 404 });
  if (row.phoneHash !== phoneHash(nv.e164)) return Response.json({ error: 'not_owner' }, { status: 401 });
  return { verification: row.v, e164: nv.e164 };
}
