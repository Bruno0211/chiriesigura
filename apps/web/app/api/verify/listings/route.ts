import { and, eq, gt, isNull } from 'drizzle-orm';
import { generateCode, parseListingUrl, pasteLine, type ListingsRequest, type ListingsResponse } from '@cs/shared';
import { getDb, type Db } from '@/lib/db';
import { listing, verification } from '@/lib/db/schema';
import { ownVerification } from '@/lib/landlord-auth';

/** How long a passed location check stays usable for one listings submission. */
const LOCATION_FRESH_MS = 10 * 60 * 1000;

const isUniqueViolation = (e: unknown) => /unique|duplicate/i.test(String((e as { cause?: unknown })?.cause ?? e));

/** Sets a code only if none exists yet, so concurrent requests all end up with the one stored code. */
async function issueCode(db: Db, verificationId: string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const [set] = await db
        .update(verification)
        .set({ code: generateCode(), verifiedAt: new Date() })
        .where(and(eq(verification.id, verificationId), isNull(verification.code)))
        .returning({ code: verification.code });
      if (set?.code) return set.code;
      const [current] = await db.select({ code: verification.code }).from(verification).where(eq(verification.id, verificationId));
      if (current?.code) return current.code;
    } catch (e) {
      if (!isUniqueViolation(e)) throw e;
    }
  }
  throw new Error('Could not generate a unique code');
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Partial<ListingsRequest> | null;
  if (!Array.isArray(body?.urls) || body.urls.some((u) => typeof u !== 'string')) {
    return Response.json({ error: 'bad_request' }, { status: 400 });
  }
  const db = getDb();
  const own = await ownVerification(db, req, body.verificationId);
  if (own instanceof Response) return own;
  const v = own.verification;

  // Every submission needs its own fresh location pass: claim it atomically so two requests can't share one.
  const [claimed] = await db
    .update(verification)
    .set({ locationCheckedAt: null })
    .where(and(eq(verification.id, v.id), gt(verification.locationCheckedAt, new Date(Date.now() - LOCATION_FRESH_MS))))
    .returning({ id: verification.id });
  if (!claimed) return Response.json({ error: 'location_not_verified' }, { status: 409 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const out: ListingsResponse = { accepted: [], rejected: [] };
  for (const raw of body.urls) {
    const url = raw.trim();
    const ref = parseListingUrl(url, appUrl);
    if (!ref) {
      out.rejected.push({ url: raw, reason: 'unparseable' });
      continue;
    }
    const [existing] = await db
      .select()
      .from(listing)
      .where(and(eq(listing.site, ref.site), eq(listing.siteListingId, ref.listingId)));
    if (existing && existing.verificationId !== v.id) {
      out.rejected.push({ url: raw, reason: 'already_registered' });
      continue;
    }
    if (!existing) {
      try {
        await db.insert(listing).values({ verificationId: v.id, site: ref.site, siteListingId: ref.listingId, url });
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
        out.rejected.push({ url: raw, reason: 'already_registered' });
        continue;
      }
    }
    out.accepted.push(ref);
  }

  if (out.accepted.length === 0) {
    // Nothing registered (typos, links already taken): give the location pass back so the landlord can retry.
    await db
      .update(verification)
      .set({ locationCheckedAt: v.locationCheckedAt })
      .where(and(eq(verification.id, v.id), isNull(verification.locationCheckedAt)));
  }

  const code = v.code ?? (out.accepted.length > 0 ? await issueCode(db, v.id) : undefined);
  if (code) Object.assign(out, { code, pasteLine: pasteLine(code) });
  return Response.json(out);
}
