import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReportResponse } from '@cs/shared';
import { makeTestDb } from '@/lib/db/test-db';
import { verification, viewingReport } from '@/lib/db/schema';
import { mockNetwork } from '@/lib/network/mock';
import { issueNvCookie } from '@/lib/nv-session';
import { addReports, seedVerified } from '@/lib/test-seed';
import type { Db } from '@/lib/db';
import { POST } from './report/route';

let db: Db;
let verificationId: string;

beforeEach(async () => {
  db = await makeTestDb();
  ({ verificationId } = await seedVerified(db));
});
afterEach(() => vi.restoreAllMocks());

const report = (body: object, phone?: string) =>
  POST(new Request('http://localhost:3000/api/viewing/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(phone ? { cookie: issueNvCookie(phone).split(';')[0]! } : {}) },
    body: JSON.stringify(body),
  }));
const ok = (category: string) => ({ consent: true, verificationId, category });

describe('POST /api/viewing/report', () => {
  it('stores a location-verified report and returns landlord-wide counts', async () => {
    await addReports(db, verificationId, 'no_show', 2);
    const res = await report(ok('no_show'), '+40711111111');
    expect(res.status).toBe(200);
    const body = (await res.json()) as ReportResponse;
    expect(body.ok).toBe(true);
    expect(body.counts).toMatchObject({ no_show: 3, ok: 0 });
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
    await report(ok('no_show'), '+40711111111');
    const res = await report({ ...ok('no_show'), verificationId: v2!.id }, '+40711111111');
    expect(((await res.json()) as ReportResponse).counts?.no_show).toBe(1);
  });

  it('answers 503 when the operator call fails', async () => {
    vi.spyOn(mockNetwork, 'verifyLocation').mockRejectedValueOnce(new Error('nokia down'));
    const res = await report(ok('no_show'), '+40711111111');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });

  it('never stores the reporter phone in the clear', async () => {
    await report(ok('ok'), '+40711111111');
    expect(JSON.stringify(await db.select().from(viewingReport))).not.toContain('711111111');
  });
});
