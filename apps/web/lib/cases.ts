import { and, between, desc, eq, gt, inArray, ne, or, sql } from 'drizzle-orm';
import { emptyCounts, REPORT_CATEGORIES, type ReportCategory, type ReportCounts, type ReviewAction } from '@cs/shared';
import type { Db } from './db';
import { landlord, listing, reportCase, reporterBar, verification, viewingReport } from './db/schema';
import { banPerson } from './queries';

export type CaseStatus = 'awaiting_landlord' | 'ready' | 'dismissed' | 'false_report' | 'banned';
export const OPEN: CaseStatus[] = ['awaiting_landlord', 'ready'];

const DAY_MS = 24 * 60 * 60 * 1000;
/** A false reporter can't report again for this long. */
const BAR_MS = 2 * 365 * DAY_MS;
/** Cases on one person this close together: a crowd gathered at the property. */
const BURST_MS = 2 * 60 * 60 * 1000;
/** How far back a reporter's cases count towards "many landlords". */
const HISTORY_MS = 90 * DAY_MS;
const MANY_LANDLORDS = 3;

/** This landlord row plus every row with the same ID card hash. A row with no hash stands alone. */
export async function personLandlordIds(db: Db, landlordId: string): Promise<string[]> {
  const [row] = await db.select({ hash: landlord.idDocHash }).from(landlord).where(eq(landlord.id, landlordId));
  if (!row?.hash) return [landlordId];
  const rows = await db.select({ id: landlord.id }).from(landlord).where(eq(landlord.idDocHash, row.hash));
  return [...new Set([landlordId, ...rows.map((r) => r.id)])];
}

export interface Standing {
  counts: ReportCounts;
  underReview: boolean;
}

/** What the badge may say about a person: only all-good counts are published, and open problem reports add the soft note. */
export async function landlordStanding(db: Db, landlordId: string): Promise<Standing> {
  const ids = await personLandlordIds(db, landlordId);
  const counts = emptyCounts();

  const [ok] = await db
    .select({ n: sql<number>`count(distinct ${viewingReport.reporterPhoneHash})::int` })
    .from(viewingReport)
    .innerJoin(verification, eq(verification.id, viewingReport.verificationId))
    .where(and(inArray(verification.landlordId, ids), eq(viewingReport.category, 'ok')));
  counts.ok = Number(ok?.n ?? 0);

  const [open] = await db
    .select({ id: reportCase.id })
    .from(reportCase)
    .where(and(inArray(reportCase.landlordId, ids), inArray(reportCase.status, OPEN)))
    .limit(1);

  return { counts, underReview: !!open };
}

/** True when a live bar matches the reporter's phone or account. */
export async function isBarred(db: Db, h: { phoneHash: string; accountHash: string | null }, now = new Date()): Promise<boolean> {
  const match = [and(eq(reporterBar.kind, 'phone'), eq(reporterBar.hash, h.phoneHash))];
  if (h.accountHash) match.push(and(eq(reporterBar.kind, 'account'), eq(reporterBar.hash, h.accountHash)));
  const [row] = await db.select({ id: reporterBar.id }).from(reporterBar).where(and(or(...match), gt(reporterBar.expiresAt, now))).limit(1);
  return !!row;
}

export type WarningSign = 'burst' | 'sim_changed' | 'reporter_many_landlords' | 'reporter_dismissed_before' | 'reporter_barred';

export interface CaseItem {
  caseId: string;
  landlordId: string;
  status: 'awaiting_landlord' | 'ready';
  category: ReportCategory;
  createdAt: string;
  locationResult: string;
  listings: { site: string; listingId: string; url: string }[];
  signs: WarningSign[];
}

/** The team's queue: open cases, ready before awaiting the landlord, newest first within each. Never names the landlord. */
export async function caseList(db: Db, now = new Date()): Promise<CaseItem[]> {
  const rows = await db
    .select({
      caseId: reportCase.id, landlordId: reportCase.landlordId, status: reportCase.status, createdAt: reportCase.createdAt,
      verificationId: viewingReport.verificationId, category: viewingReport.category, locationResult: viewingReport.locationResult,
      phoneHash: viewingReport.reporterPhoneHash, accountHash: viewingReport.reporterAccountHash, simSwapped: viewingReport.simSwapped,
    })
    .from(reportCase)
    .innerJoin(viewingReport, eq(viewingReport.id, reportCase.reportId))
    .where(inArray(reportCase.status, OPEN))
    .orderBy(desc(eq(reportCase.status, 'ready')), desc(reportCase.createdAt));
  // shortcut: a few queries per open case, fine for hackathon volumes; aggregate in SQL if the queue grows.
  const items: CaseItem[] = [];
  for (const r of rows) {
    const listings = await db
      .select({ site: listing.site, listingId: listing.siteListingId, url: listing.url })
      .from(listing)
      .where(eq(listing.verificationId, r.verificationId));
    items.push({
      caseId: r.caseId,
      landlordId: r.landlordId,
      status: r.status as CaseItem['status'],
      category: r.category as ReportCategory,
      createdAt: r.createdAt.toISOString(),
      locationResult: r.locationResult,
      listings,
      signs: await warningSigns(db, r, now),
    });
  }
  return items;
}

interface SignInput {
  caseId: string;
  landlordId: string;
  createdAt: Date;
  phoneHash: string;
  accountHash: string | null;
  simSwapped: boolean | null;
}

async function warningSigns(db: Db, c: SignInput, now: Date): Promise<WarningSign[]> {
  const signs: WarningSign[] = [];
  const at = c.createdAt.getTime();

  const [burst] = await db
    .select({ id: reportCase.id })
    .from(reportCase)
    .where(and(
      inArray(reportCase.landlordId, await personLandlordIds(db, c.landlordId)),
      ne(reportCase.id, c.caseId),
      between(reportCase.createdAt, new Date(at - BURST_MS), new Date(at + BURST_MS)),
    ))
    .limit(1);
  if (burst) signs.push('burst');

  if (c.simSwapped === true) signs.push('sim_changed');

  // The same reporter: their phone, or their account on another phone.
  const reporter = c.accountHash
    ? or(eq(viewingReport.reporterPhoneHash, c.phoneHash), eq(viewingReport.reporterAccountHash, c.accountHash))
    : eq(viewingReport.reporterPhoneHash, c.phoneHash);
  const [busy] = await db
    .select({ n: sql<number>`count(distinct ${reportCase.landlordId})::int` })
    .from(reportCase)
    .innerJoin(viewingReport, eq(viewingReport.id, reportCase.reportId))
    .where(and(reporter, gt(reportCase.createdAt, new Date(now.getTime() - HISTORY_MS))));
  if (Number(busy?.n ?? 0) >= MANY_LANDLORDS) signs.push('reporter_many_landlords');

  const [dismissed] = await db
    .select({ id: reportCase.id })
    .from(reportCase)
    .innerJoin(viewingReport, eq(viewingReport.id, reportCase.reportId))
    .where(and(reporter, ne(reportCase.id, c.caseId), eq(reportCase.status, 'dismissed')))
    .limit(1);
  if (dismissed) signs.push('reporter_dismissed_before');

  if (await isBarred(db, { phoneHash: c.phoneHash, accountHash: c.accountHash }, now)) signs.push('reporter_barred');
  return signs;
}

export type DecideResult = 'ok' | 'not_found' | 'not_ready' | 'already_decided';

/** Each action's outcome, and the statuses it may decide from (spec §4.5). */
const DECISIONS: Record<ReviewAction, { to: CaseStatus; from: CaseStatus[] }> = {
  ban: { to: 'banned', from: ['ready'] },
  dismiss: { to: 'dismissed', from: OPEN },
  false_report: { to: 'false_report', from: OPEN },
};

/**
 * The team decides one case. The status check and the write are one conditional update, so of two
 * racing decisions exactly one lands. A ban or a false-report bar commits together with the decision.
 */
export async function decideCase(db: Db, caseId: string, action: ReviewAction, reviewer: string, now = new Date()): Promise<DecideResult> {
  const { to, from } = DECISIONS[action];
  return db.transaction(async (tx) => {
    const [decided] = await tx
      .update(reportCase)
      .set({ status: to, decidedAt: now, decidedBy: reviewer })
      .where(and(eq(reportCase.id, caseId), inArray(reportCase.status, from)))
      .returning({ landlordId: reportCase.landlordId, reportId: reportCase.reportId });
    if (!decided) {
      const [row] = await tx.select({ status: reportCase.status }).from(reportCase).where(eq(reportCase.id, caseId));
      if (!row) return 'not_found';
      return OPEN.includes(row.status as CaseStatus) ? 'not_ready' : 'already_decided';
    }
    if (action === 'ban') await banPerson(tx, decided.landlordId);
    if (action === 'false_report') await barReporter(tx, caseId, decided.reportId, now);
    return 'ok';
  });
}

/** A case's current status, for telling a reviewer who lost a race what the other decision was. */
export async function caseStatus(db: Db, caseId: string): Promise<CaseStatus | null> {
  const [row] = await db.select({ status: reportCase.status }).from(reportCase).where(eq(reportCase.id, caseId));
  return (row?.status as CaseStatus | undefined) ?? null;
}

/** Bars the report's phone and, when known, its account from reporting, for 2 years from now. */
async function barReporter(db: Db, caseId: string, reportId: string, now: Date): Promise<void> {
  const [r] = await db
    .select({ phone: viewingReport.reporterPhoneHash, account: viewingReport.reporterAccountHash })
    .from(viewingReport)
    .where(eq(viewingReport.id, reportId));
  const expiresAt = new Date(now.getTime() + BAR_MS);
  const hashes = [{ kind: 'phone', hash: r!.phone }, ...(r!.account ? [{ kind: 'account', hash: r!.account }] : [])];
  await db
    .insert(reporterBar)
    .values(hashes.map((h) => ({ ...h, caseId, expiresAt })))
    .onConflictDoUpdate({ target: [reporterBar.kind, reporterBar.hash], set: { caseId, expiresAt } });
}
