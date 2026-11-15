import { and, eq, gt, inArray, or, sql } from 'drizzle-orm';
import { emptyCounts, REPORT_CATEGORIES, type ReportCategory, type ReportCounts } from '@cs/shared';
import type { Db } from './db';
import { landlord, reportCase, reporterBar, verification, viewingReport } from './db/schema';

export type CaseStatus = 'awaiting_landlord' | 'ready' | 'dismissed' | 'false_report' | 'upheld';
export const OPEN: CaseStatus[] = ['awaiting_landlord', 'ready'];

/** An upheld case counts for this long after the team decided it. */
const UPHELD_MS = 2 * 365 * 24 * 60 * 60 * 1000;

/** This landlord row plus every row with the same ID card hash. A row with no hash stands alone. */
export async function personLandlordIds(db: Db, landlordId: string): Promise<string[]> {
  const [row] = await db.select({ hash: landlord.idDocHash }).from(landlord).where(eq(landlord.id, landlordId));
  if (!row?.hash) return [landlordId];
  const rows = await db.select({ id: landlord.id }).from(landlord).where(eq(landlord.idDocHash, row.hash));
  return [...new Set([landlordId, ...rows.map((r) => r.id)])];
}

export interface Standing {
  counts: ReportCounts;
  warned: boolean;
  underReview: boolean;
}

/** What the badge may say about a person: ok reports at once, problems only once the team upheld them. */
export async function landlordStanding(db: Db, landlordId: string, now = new Date()): Promise<Standing> {
  const ids = await personLandlordIds(db, landlordId);
  const counts = emptyCounts();

  const [ok] = await db
    .select({ n: sql<number>`count(distinct ${viewingReport.reporterPhoneHash})::int` })
    .from(viewingReport)
    .innerJoin(verification, eq(verification.id, viewingReport.verificationId))
    .where(and(inArray(verification.landlordId, ids), eq(viewingReport.category, 'ok')));
  counts.ok = Number(ok?.n ?? 0);

  const upheld = await db
    .select({ category: viewingReport.category, n: sql<number>`count(distinct ${viewingReport.reporterPhoneHash})::int` })
    .from(reportCase)
    .innerJoin(viewingReport, eq(viewingReport.id, reportCase.reportId))
    .where(and(inArray(reportCase.landlordId, ids), eq(reportCase.status, 'upheld'), gt(reportCase.decidedAt, new Date(now.getTime() - UPHELD_MS))))
    .groupBy(viewingReport.category);
  for (const r of upheld) if (REPORT_CATEGORIES.includes(r.category as ReportCategory)) counts[r.category as ReportCategory] = Number(r.n);

  const [open] = await db
    .select({ id: reportCase.id })
    .from(reportCase)
    .where(and(inArray(reportCase.landlordId, ids), inArray(reportCase.status, OPEN)))
    .limit(1);

  return { counts, warned: upheld.length > 0, underReview: !!open };
}

/** True when a live bar matches the reporter's phone or account. */
export async function isBarred(db: Db, h: { phoneHash: string; accountHash: string | null }, now = new Date()): Promise<boolean> {
  const match = [and(eq(reporterBar.kind, 'phone'), eq(reporterBar.hash, h.phoneHash))];
  if (h.accountHash) match.push(and(eq(reporterBar.kind, 'account'), eq(reporterBar.hash, h.accountHash)));
  const [row] = await db.select({ id: reporterBar.id }).from(reporterBar).where(and(or(...match), gt(reporterBar.expiresAt, now))).limit(1);
  return !!row;
}
