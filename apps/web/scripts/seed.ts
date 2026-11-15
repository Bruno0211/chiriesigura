import { and, eq, inArray, ne, notInArray, or } from 'drizzle-orm';
import { getDb, type Db } from '@/lib/db';
import { demoListingEdit, landlord, listing, reporterBar, reportCase, verification, viewingReport } from '@/lib/db/schema';
import { DEMO_ADDRESSES, DEMO_APARTMENT } from '@/lib/geocode';
import { identityHashes, phoneHash } from '@/lib/hash';

const DEMO_CODE = 'VC-7K3Q';
// Nokia simulator numbers: they pass the live checks (docs/checkpoints.md) and, having no mock fixture, mock mode too.
const LANDLORD = '+99999992002';
const LIVE_REPORTER = '+99999992000';
const EARLIER_ALL_GOOD = ['+40711111118', '+40711111119'];
// The banned-live scammer (docs/pitch.md): starts with 3 "asked for money" cases waiting for the team.
const SCAM_CODE = 'VC-BAN5';
const SCAMMER = '+40700000009';
// Radu: verified in Timișoara, his code on a flat that says Cluj (the place check, docs/pitch.md Q&A).
const FAR_CODE = 'VC-CLJ7';
const FAR_LANDLORD = '+40700000011';
const SCAMMER_ID = { givenName: 'Mihai', familyName: 'Ionescu', birthdate: '1990-07-15', idDocument: 'TM654321' };
const SCAM_REPORTERS = ['+40711111121', '+40711111122', '+40711111123'];

/** A demo landlord fresh from the checks, with any rehearsal ban lifted. */
const CLEAN = (now: Date) => ({ numberVerifiedAt: now, kycMatchedAt: now, simCheckedAt: now, bannedAt: null });

/** Idempotent demo setup and reset: run before every rehearsal (plan Task 13). */
export async function seed(db: Db): Promise<void> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  const now = new Date();

  // Reset what the live demo creates. Lift the rehearsal bars first: a false-report bar on the presenter's real
  // account hash can't be computed here, so find it through its case. Deleting the report sets caseId null.
  const demoLandlords = db
    .select({ id: landlord.id })
    .from(landlord)
    .where(inArray(landlord.phoneHash, [LANDLORD, SCAMMER, FAR_LANDLORD].map(phoneHash)));
  const demoCases = db.select({ id: reportCase.id }).from(reportCase).where(inArray(reportCase.landlordId, demoLandlords));
  const demoPhones = [LIVE_REPORTER, ...EARLIER_ALL_GOOD, ...SCAM_REPORTERS].map(phoneHash);
  await db.delete(reporterBar).where(or(inArray(reporterBar.caseId, demoCases), inArray(reporterBar.hash, demoPhones)));
  // The student's report and the landlord's d4 registration.
  await db.delete(viewingReport).where(eq(viewingReport.reporterPhoneHash, phoneHash(LIVE_REPORTER)));
  await db.delete(listing).where(and(eq(listing.site, 'demo'), eq(listing.siteListingId, 'd4')));
  // The landlord's edit to d4 (the pasted code line): every rehearsal starts from the built-in text.
  await db.delete(demoListingEdit);

  const [l] = await db
    .insert(landlord)
    .values({ phoneHash: phoneHash(LANDLORD), ...CLEAN(now) })
    .onConflictDoUpdate({ target: landlord.phoneHash, set: CLEAN(now) })
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
  await resetReports(db, v!.id, l!.id, EARLIER_ALL_GOOD, 'ok');

  await seedScammer(db, appUrl, now);
  await seedFarListing(db, appUrl, now);
}

/** Mihai, the scammer: verified under his real ID, three open cases for the team. Reseeding lifts any ban from a rehearsal. */
async function seedScammer(db: Db, appUrl: string, now: Date): Promise<void> {
  const person = { numberVerifiedAt: now, kycMatchedAt: now, simCheckedAt: now, ...identityHashes(SCAMMER_ID), bannedAt: null };
  const [l] = await db
    .insert(landlord)
    .values({ phoneHash: phoneHash(SCAMMER), ...person })
    .onConflictDoUpdate({ target: landlord.phoneHash, set: person })
    .returning();
  const fields = { landlordId: l!.id, addressText: DEMO_APARTMENT, ...DEMO_ADDRESSES[DEMO_APARTMENT]!, locationResult: 'TRUE', verifiedAt: now };
  const [v] = await db
    .insert(verification)
    .values({ code: SCAM_CODE, ...fields })
    .onConflictDoUpdate({ target: verification.code, set: fields })
    .returning();
  await db
    .insert(listing)
    .values({ verificationId: v!.id, site: 'demo', siteListingId: 'd5', url: `${appUrl}/demo/listing/d5` })
    .onConflictDoUpdate({ target: [listing.site, listing.siteListingId], set: { verificationId: v!.id } });
  await resetReports(db, v!.id, l!.id, SCAM_REPORTERS, 'money_upfront');
}

/** Leaves exactly the seeded reports on a demo verification, dropping any a rehearsal added. */
async function resetReports(db: Db, verificationId: string, landlordId: string, phones: string[], category: 'ok' | 'money_upfront'): Promise<void> {
  const hashes = phones.map(phoneHash);
  await db.delete(viewingReport).where(and(eq(viewingReport.verificationId, verificationId), notInArray(viewingReport.reporterPhoneHash, hashes)));
  for (const h of hashes) {
    // Days apart, so the three scam cases show no burst warning (2 h window).
    const createdAt = new Date(Date.now() - (hashes.length - hashes.indexOf(h)) * 86_400_000);
    await db.insert(viewingReport).values({ verificationId, reporterPhoneHash: h, locationResult: 'TRUE', category, createdAt }).onConflictDoUpdate({ target: [viewingReport.verificationId, viewingReport.reporterPhoneHash], set: { category, createdAt } });
    const [r] = await db.select({ id: viewingReport.id }).from(viewingReport).where(and(eq(viewingReport.verificationId, verificationId), eq(viewingReport.reporterPhoneHash, h)));
    if (category === 'ok') {
      await db.delete(reportCase).where(eq(reportCase.reportId, r!.id)); // all-good reports need no case; an old reseed may have left one
      continue;
    }
    await db
      .insert(reportCase)
      .values({ reportId: r!.id, landlordId, status: 'ready', createdAt })
      .onConflictDoUpdate({ target: reportCase.reportId, set: { status: 'ready', decidedAt: null, decidedBy: null, createdAt } });
  }
}

/** Radu: a verified landlord whose d7 listing says the flat is in Cluj. */
async function seedFarListing(db: Db, appUrl: string, now: Date): Promise<void> {
  const checks = CLEAN(now);
  const [l] = await db
    .insert(landlord)
    .values({ phoneHash: phoneHash(FAR_LANDLORD), ...checks })
    .onConflictDoUpdate({ target: landlord.phoneHash, set: checks })
    .returning();
  const fields = { landlordId: l!.id, addressText: DEMO_APARTMENT, ...DEMO_ADDRESSES[DEMO_APARTMENT]!, locationResult: 'TRUE', verifiedAt: now };
  const [v] = await db
    .insert(verification)
    .values({ code: FAR_CODE, ...fields })
    .onConflictDoUpdate({ target: verification.code, set: fields })
    .returning();
  await db
    .insert(listing)
    .values({ verificationId: v!.id, site: 'demo', siteListingId: 'd7', url: `${appUrl}/demo/listing/d7` })
    .onConflictDoUpdate({ target: [listing.site, listing.siteListingId], set: { verificationId: v!.id } });
}

// Run directly (`pnpm seed`), not when a test imports it.
if (/[\\/]scripts[\\/]seed\.ts$/.test(process.argv[1] ?? '')) {
  // `vercel env pull` writes "[SENSITIVE]" for secrets; seeding with it silently breaks every phone match.
  if (process.env.PHONE_PEPPER?.startsWith('[')) throw new Error('PHONE_PEPPER is a placeholder: set the real team value');
  seed(getDb()).then(
    () => {
      console.log(`Seeded: ${DEMO_CODE} on demo:d1 with ${EARLIER_ALL_GOOD.length} earlier all-good reports; demo:d4 is free; ${SCAM_CODE} on demo:d5 with ${SCAM_REPORTERS.length} open cases; ${FAR_CODE} on demo:d7 (far away).`);
      process.exit(0);
    },
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
