import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReportResponse } from '@cs/shared';
import { makeTestDb } from '@/lib/db/test-db';
import { reportCase, reporterBar, verification, viewingReport } from '@/lib/db/schema';
import { accountHash, phoneHash } from '@/lib/hash';
import { signedInSub } from '@/lib/auth0';
import { mockNetwork } from '@/lib/network/mock';
import { issueNvCookie } from '@/lib/nv-session';
import { addReports, seedVerified } from '@/lib/test-seed';
import type { Db } from '@/lib/db';
import { POST } from './report/route';

vi.mock('@/lib/auth0', () => ({ signedInSub: vi.fn(async () => 'google-oauth2|student') }));

let db: Db;
let verificationId: string;

beforeEach(async () => {
  db = await makeTestDb();
  ({ verificationId } = await seedVerified(db));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(signedInSub).mockResolvedValue('google-oauth2|student');
});

const report = (body: object, phone?: string) =>
  POST(new Request('http://localhost:3000/api/viewing/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(phone ? { cookie: issueNvCookie(phone).split(';')[0]! } : {}) },
    body: JSON.stringify(body),
  }));
const ok = (category: string) => ({ consent: true, verificationId, category });

describe('POST /api/viewing/report', () => {
  it('stores a location-verified report, opens a ready case and hides the problem count', async () => {
    await addReports(db, verificationId, 'no_show', 2);
    const res = await report(ok('no_show'), '+40711111111');
    expect(res.status).toBe(200);
    const body = (await res.json()) as ReportResponse;
    expect(body.ok).toBe(true);
    expect(body.counts).toMatchObject({ no_show: 0, ok: 0 });
    const rows = await db.select().from(viewingReport).where(eq(viewingReport.reporterPhoneHash, phoneHash('+40711111111')));
    expect(rows[0]!.reporterAccountHash).toBe(accountHash('google-oauth2|student'));
    const cases = await db.select().from(reportCase).where(eq(reportCase.reportId, rows[0]!.id));
    expect(cases).toHaveLength(1);
    expect(cases[0]!.status).toBe('ready');
  });

  it('an ok report opens no case and counts at once', async () => {
    const res = await report(ok('ok'), '+40711111111');
    expect(res.status).toBe(200);
    expect(((await res.json()) as ReportResponse).counts?.ok).toBe(1);
    expect(await db.select().from(reportCase)).toHaveLength(0);
  });

  it('refuses a signed-out reporter', async () => {
    vi.mocked(signedInSub).mockResolvedValue(null);
    const res = await report(ok('no_show'), '+40711111111');
    expect(res.status).toBe(401);
    expect(((await res.json()) as ReportResponse).reason).toBe('signed_out');
    expect(await db.select().from(viewingReport)).toHaveLength(0);
  });

  it('refuses a barred phone and a barred account', async () => {
    const expiresAt = new Date(Date.now() + 86_400_000);
    await db.insert(reporterBar).values({ kind: 'phone', hash: phoneHash('+40711111111'), expiresAt });
    const a = await report(ok('no_show'), '+40711111111');
    expect(a.status).toBe(403);
    expect(((await a.json()) as ReportResponse).reason).toBe('barred');
    await db.insert(reporterBar).values({ kind: 'account', hash: accountHash('google-oauth2|student'), expiresAt });
    const b = await report(ok('no_show'), '+40711111113');
    expect(b.status).toBe(403);
    expect(((await b.json()) as ReportResponse).reason).toBe('barred');
    expect(await db.select().from(viewingReport)).toHaveLength(0);
  });

  it('an expired bar no longer blocks', async () => {
    await db.insert(reporterBar).values({ kind: 'phone', hash: phoneHash('+40711111111'), expiresAt: new Date(Date.now() - 86_400_000) });
    expect((await report(ok('no_show'), '+40711111111')).status).toBe(200);
  });

  it('the landlord cannot report their own listing', async () => {
    const res = await report(ok('no_show'), '+40700000001');
    expect(res.status).toBe(403);
    expect(((await res.json()) as ReportResponse).reason).toBe('own_listing');
    expect(await db.select().from(viewingReport)).toHaveLength(0);
  });

  it('records the SIM-swap answer', async () => {
    vi.spyOn(mockNetwork, 'simSwapped').mockResolvedValueOnce(true);
    await report(ok('no_show'), '+40711111111');
    expect((await db.select().from(viewingReport))[0]!.simSwapped).toBe(true);
  });

  it('a failed SIM-swap call still files the report', async () => {
    vi.spyOn(mockNetwork, 'simSwapped').mockRejectedValueOnce(new Error('operator down'));
    const res = await report(ok('no_show'), '+40711111111');
    expect(res.status).toBe(200);
    expect((await db.select().from(viewingReport))[0]!.simSwapped).toBeNull();
  });

  it('a hung SIM-swap call times out after 3 seconds and the report is still filed', async () => {
    const spy = vi.spyOn(mockNetwork, 'simSwapped').mockImplementationOnce(() => new Promise<boolean>(() => {}));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const pending = report(ok('no_show'), '+40711111111');
      await vi.waitFor(() => expect(spy).toHaveBeenCalled());
      await vi.advanceTimersByTimeAsync(3000);
      const res = await pending;
      expect(res.status).toBe(200);
      expect((await db.select().from(viewingReport))[0]!.simSwapped).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('a double tap on a problem report makes exactly one case', async () => {
    await Promise.all([report(ok('no_show'), '+40711111112'), report(ok('no_show'), '+40711111112')]);
    expect(await db.select().from(viewingReport)).toHaveLength(1);
    expect(await db.select().from(reportCase)).toHaveLength(1);
  });

  it('allows one report per phone per verification', async () => {
    await report(ok('no_show'), '+40711111111');
    const res = await report(ok('ok'), '+40711111111');
    expect(res.status).toBe(409);
    expect(((await res.json()) as ReportResponse).reason).toBe('already_reported');
    expect(await db.select().from(viewingReport)).toHaveLength(1);
  });

  it('handles a double-tap: exactly one succeeds', async () => {
    const [a, b] = await Promise.all([report(ok('no_show'), '+40711111112'), report(ok('no_show'), '+40711111112')]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect(await db.select().from(viewingReport)).toHaveLength(1);
  });

  it('refuses reports from someone not at the address', async () => {
    const res = await report(ok('no_show'), '+40700000004');
    expect(res.status).toBe(403);
    expect(((await res.json()) as ReportResponse).reason).toBe('not_at_address');
    expect(await db.select().from(viewingReport)).toHaveLength(0);
  });

  it('validates consent and category', async () => {
    expect((await report({ ...ok('spam') }, '+40711111111')).status).toBe(400);
    expect((await report({ verificationId, category: 'ok' }, '+40711111111')).status).toBe(400);
  });

  it('requires number verification', async () => {
    const res = await report(ok('ok'));
    expect(res.status).toBe(401);
    expect(((await res.json()) as ReportResponse).reason).toBe('not_number_verified');
  });

  it('404s an unknown verification', async () => {
    expect((await report({ ...ok('ok'), verificationId: '00000000-0000-0000-0000-000000000000' }, '+40711111111')).status).toBe(404);
  });

  it('counts one student once per landlord, even across several verifications', async () => {
    const [v2] = await db.insert(verification).values({
      landlordId: (await db.select().from(verification))[0]!.landlordId, code: 'VC-AAAA', addressText: 'x', lat: 45.75, lng: 21.22, locationResult: 'TRUE', verifiedAt: new Date(),
    }).returning();
    await report(ok('ok'), '+40711111111');
    const res = await report({ ...ok('ok'), verificationId: v2!.id }, '+40711111111');
    expect(((await res.json()) as ReportResponse).counts?.ok).toBe(1);
  });

  it('answers 503 when the operator call fails', async () => {
    vi.spyOn(mockNetwork, 'verifyLocation').mockRejectedValueOnce(new Error('nokia down'));
    const res = await report(ok('no_show'), '+40711111111');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });

  it('never stores the reporter phone or account id in the clear', async () => {
    await report(ok('no_show'), '+40711111111');
    const dump = JSON.stringify([await db.select().from(viewingReport), await db.select().from(reportCase)]);
    expect(dump).not.toContain('711111111');
    expect(dump).not.toContain('google-oauth2');
    expect(dump).not.toContain('student');
  });
});
