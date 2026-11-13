import type { CheckStep, IdentityRequest, IdentityResponse } from '@cs/shared';
import { getDb } from '@/lib/db';
import { landlord, verification } from '@/lib/db/schema';
import { geocode } from '@/lib/geocode';
import { phoneHash } from '@/lib/hash';
import { CHECK_ERROR, kycPasses, network } from '@/lib/network';
import { readNv } from '@/lib/nv-session';

const SIM_SWAP_WINDOW_HOURS = 168;
const FIELDS = ['givenName', 'familyName', 'birthdate', 'idDocument', 'address'] as const;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<IdentityRequest> | null;
  if (body?.consent !== true || FIELDS.some((f) => typeof body[f] !== 'string' || !body[f]!.trim())) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const nv = readNv(req);
  if (!nv) return Response.json({ error: 'not_number_verified' }, { status: 401 });
  const b = body as IdentityRequest;

  // ID fields go to the operator only; nothing below persists them. A failed operator call becomes null, shown as "couldn't run".
  const [kyc, swapped] = await Promise.all([
    network().kycMatch(nv.e164, { givenName: b.givenName, familyName: b.familyName, birthdate: b.birthdate, idDocument: b.idDocument }).catch(() => null),
    network().simSwapped(nv.e164, SIM_SWAP_WINDOW_HOURS).catch(() => null),
  ]);
  const steps: CheckStep[] = [
    { name: 'number', ok: true, message: 'Phone number confirmed' },
    kyc === null
      ? { name: 'kyc', ok: false, message: CHECK_ERROR }
      : kycPasses(kyc)
        ? { name: 'kyc', ok: true, message: "ID details match this phone number's owner" }
        : { name: 'kyc', ok: false, message: "Your ID details don't match this phone number's owner" },
    swapped === null
      ? { name: 'simswap', ok: false, message: CHECK_ERROR }
      : swapped
        ? { name: 'simswap', ok: false, message: 'This SIM was changed in the last 7 days' }
        : { name: 'simswap', ok: true, message: 'No recent SIM change' },
  ];
  if (steps.some((s) => !s.ok)) return Response.json({ ok: false, steps } satisfies IdentityResponse);

  const coords = await geocode(b.address);
  if (!coords) {
    steps.push({ name: 'location', ok: false, message: "We couldn't find that address" });
    return Response.json({ ok: false, steps } satisfies IdentityResponse);
  }

  const db = getDb();
  const now = new Date();
  const [l] = await db
    .insert(landlord)
    .values({ phoneHash: phoneHash(nv.e164), numberVerifiedAt: now, kycMatchedAt: now, simCheckedAt: now })
    .onConflictDoUpdate({ target: landlord.phoneHash, set: { numberVerifiedAt: now, kycMatchedAt: now, simCheckedAt: now } })
    .returning();
  const [v] = await db.insert(verification).values({ landlordId: l!.id, addressText: b.address.trim(), ...coords }).returning();
  return Response.json({ ok: true, steps, verificationId: v!.id } satisfies IdentityResponse);
}
