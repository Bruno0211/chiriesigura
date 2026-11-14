import { and, eq, ne } from 'drizzle-orm';
import { getDb, type Db } from '@/lib/db';
import { landlord, listing, verification, viewingReport } from '@/lib/db/schema';
import { DEMO_ADDRESSES, DEMO_APARTMENT } from '@/lib/geocode';
import { phoneHash } from '@/lib/hash';

const DEMO_CODE = 'VC-7K3Q';
// Nokia simulator numbers: they pass the live checks (docs/checkpoints.md) and, having no mock fixture, mock mode too.
const LANDLORD = '+99999992002';
const LIVE_REPORTER = '+99999992000';
const EARLIER_NO_SHOWS = ['+40711111118', '+40711111119'];

/** Idempotent demo setup and reset: run before every rehearsal (plan Task 13). */
export async function seed(db: Db): Promise<void> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  const now = new Date();

  // Reset what the live demo creates: the student's report and the landlord's d4 registration.
  await db.delete(viewingReport).where(eq(viewingReport.reporterPhoneHash, phoneHash(LIVE_REPORTER)));
  await db.delete(listing).where(and(eq(listing.site, 'demo'), eq(listing.siteListingId, 'd4')));

  const [l] = await db
    .insert(landlord)
    .values({ phoneHash: phoneHash(LANDLORD), numberVerifiedAt: now, kycMatchedAt: now, simCheckedAt: now })
    .onConflictDoUpdate({ target: landlord.phoneHash, set: { numberVerifiedAt: now, kycMatchedAt: now, simCheckedAt: now } })
    .returning();
  const fields = { landlordId: l!.id, addressText: DEMO_APARTMENT, ...DEMO_ADDRESSES[DEMO_APARTMENT]!, locationResult: 'TRUE', verifiedAt: now };
  const [v] = await db
    .insert(verification)
    .values({ code: DEMO_CODE, ...fields })
    .onConflictDoUpdate({ target: verification.code, set: fields })
    .returning();
  // Verifications the landlord made in earlier live runs (cascades their listings and reports).
  await db.delete(verification).where(and(eq(verification.landlordId, l!.id), ne(verification.id, v!.id)));

  await db
    .insert(listing)
    .values({ verificationId: v!.id, site: 'demo', siteListingId: 'd1', url: `${appUrl}/demo/listing/d1` })
    .onConflictDoUpdate({ target: [listing.site, listing.siteListingId], set: { verificationId: v!.id } });
  for (const phone of EARLIER_NO_SHOWS) {
    await db
      .insert(viewingReport)
      .values({ verificationId: v!.id, reporterPhoneHash: phoneHash(phone), locationResult: 'TRUE', category: 'no_show' })
      .onConflictDoNothing();
  }
}

// Run directly (`pnpm seed`), not when a test imports it.
if (/[\\/]scripts[\\/]seed\.ts$/.test(process.argv[1] ?? '')) {
  // `vercel env pull` writes "[SENSITIVE]" for secrets; seeding with it silently breaks every phone match.
  if (process.env.PHONE_PEPPER?.startsWith('[')) throw new Error('PHONE_PEPPER is a placeholder: set the real team value');
  seed(getDb()).then(
    () => {
      console.log(`Seeded: ${DEMO_CODE} on demo:d1 with ${EARLIER_NO_SHOWS.length} earlier no-shows; demo:d4 is free.`);
      process.exit(0);
    },
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
