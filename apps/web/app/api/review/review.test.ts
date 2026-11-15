import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import type { CheckResponse } from '@cs/shared';
import { auth0 } from '@/lib/auth0';
import { makeTestDb } from '@/lib/db/test-db';
import { landlord, reportCase, reporterBar } from '@/lib/db/schema';
import { addCases, seedVerified } from '@/lib/test-seed';
import type { Db } from '@/lib/db';
import { GET as checkRoute } from '../check/route';
import { POST } from './route';

vi.mock('@/lib/auth0', () => ({ auth0: { getSession: vi.fn() }, isSignedIn: vi.fn(async () => true) }));

let db: Db;
let seeded: Awaited<ReturnType<typeof seedVerified>>;
let caseId: string;

const DAY = 24 * 60 * 60 * 1000;
const as = (email: string | null, verified = true) =>
  vi.mocked(auth0.getSession).mockResolvedValue(email ? ({ user: { email, email_verified: verified } } as never) : null);
const review = (body: unknown) =>
  POST(new Request('http://localhost:3000/api/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
const check = async () =>
  (await (await checkRoute(new Request('http://localhost:3000/api/check?site=demo&listingId=d1&code=VC-7K3Q'))).json()) as CheckResponse;
const bannedAt = async (id: string) => (await db.select().from(landlord).where(eq(landlord.id, id)))[0]!.bannedAt;
const theCase = async () => (await db.select().from(reportCase).where(eq(reportCase.id, caseId)))[0]!;

beforeEach(async () => {
  vi.stubEnv('REVIEW_EMAILS', 'team@x.ro, Lead@x.ro');
  db = await makeTestDb();
  seeded = await seedVerified(db);
  [caseId] = (await addCases(db, seeded.verificationId, 'money_upfront', 1)) as [string];
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(auth0.getSession).mockReset();
});

describe('POST /api/review', () => {
  it.each([
    ['no session', null, true],
    ['a student', 'student@x.ro', true],
    ['a team email that is not verified', 'team@x.ro', false],
  ] as const)('refuses %s', async (_, email, verified) => {
    as(email, verified);
    const res = await review({ caseId, action: 'ban' });
    expect(res.status).toBe(403);
    expect(await bannedAt(seeded.landlordId)).toBeNull();
    expect(await theCase()).toMatchObject({ status: 'ready', decidedAt: null, decidedBy: null });
  });

  it('a stale uphold action is a bad request', async () => {
    as('team@x.ro');
    const res = await review({ caseId, action: 'uphold' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad_request' });
    expect(await theCase()).toMatchObject({ status: 'ready' });
    expect(await bannedAt(seeded.landlordId)).toBeNull();
  });

  it('ban bans the person and the badge goes red (email compared case-insensitively)', async () => {
    as('lead@x.ro');
    expect((await review({ caseId, action: 'ban' })).status).toBe(200);
    expect(await theCase()).toMatchObject({ status: 'banned' });
    expect((await check()).status).toBe('red_banned');
  });

  it('a ban spreads through the ID card hash only', async () => {
    as('team@x.ro');
    await db.update(landlord).set({ idDocHash: 'card-1', nameBirthHash: 'name-1' }).where(eq(landlord.id, seeded.landlordId));
    const [sameCard] = await db.insert(landlord).values({ phoneHash: 'same-card', idDocHash: 'card-1', nameBirthHash: 'name-2' }).returning();
    const [namesake] = await db.insert(landlord).values({ phoneHash: 'namesake', idDocHash: 'card-9', nameBirthHash: 'name-1' }).returning();
    const [legacy] = await db.insert(landlord).values({ phoneHash: 'legacy' }).returning();
    expect((await review({ caseId, action: 'ban' })).status).toBe(200);
    expect(await bannedAt(sameCard!.id)).not.toBeNull();
    expect(await bannedAt(namesake!.id)).toBeNull();
    expect(await bannedAt(legacy!.id)).toBeNull();
  });

  it('dismiss clears the soft note and touches nothing else', async () => {
    as('team@x.ro');
    expect(await check()).toMatchObject({ status: 'green', underReview: true });
    expect((await review({ caseId, action: 'dismiss' })).status).toBe(200);
    const body = await check();
    expect(body.status).toBe('green');
    expect(body.underReview).toBeUndefined();
    expect(await theCase()).toMatchObject({ status: 'dismissed' });
    expect(await db.select().from(reporterBar)).toEqual([]);
    expect(await bannedAt(seeded.landlordId)).toBeNull();
  });

  it('false report bars the reporter phone and account for 2 years', async () => {
    as('team@x.ro');
    expect((await review({ caseId, action: 'false_report' })).status).toBe(200);
    expect(await theCase()).toMatchObject({ status: 'false_report' });
    const bars = await db.select().from(reporterBar);
    expect(bars.map((b) => [b.kind, b.hash, b.caseId]).sort()).toEqual([
      ['account', 'a-money_upfront-0', caseId],
      ['phone', 'c-money_upfront-0', caseId],
    ]);
    for (const b of bars) expect(Math.abs(b.expiresAt.getTime() - (Date.now() + 730 * DAY))).toBeLessThan(60_000);
    expect((await check()).status).toBe('green');
  });

  it('ban is refused while awaiting the landlord; dismiss works', async () => {
    as('team@x.ro');
    await db.update(reportCase).set({ status: 'awaiting_landlord' }).where(eq(reportCase.id, caseId));
    const res = await review({ caseId, action: 'ban' });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'not_ready' });
    expect(await bannedAt(seeded.landlordId)).toBeNull();
    expect(await theCase()).toMatchObject({ status: 'awaiting_landlord' });
    expect((await review({ caseId, action: 'dismiss' })).status).toBe(200);
    expect(await theCase()).toMatchObject({ status: 'dismissed' });
  });

  it('a double decision lands once', async () => {
    as('team@x.ro');
    const [first, second] = await Promise.all([review({ caseId, action: 'ban' }), review({ caseId, action: 'dismiss' })]);
    expect([first!.status, second!.status]).toEqual([200, 409]);
    expect(await second!.json()).toEqual({ error: 'already_decided', status: 'banned' });
    expect(await theCase()).toMatchObject({ status: 'banned' });
  });

  it('records which reviewer decided', async () => {
    as('Lead@X.ro');
    await review({ caseId, action: 'ban' });
    const c = await theCase();
    expect(c.decidedBy).toBe('lead@x.ro');
    expect(c.decidedAt).not.toBeNull();
  });

  it('404 unknown case, 400 bad body', async () => {
    as('team@x.ro');
    expect((await review({ caseId: '00000000-0000-4000-8000-000000000000', action: 'ban' })).status).toBe(404);
    expect((await review({ caseId: 'not-a-uuid', action: 'ban' })).status).toBe(400);
    expect((await review({ caseId, action: 'delete' })).status).toBe(400);
    expect((await review({ landlordId: seeded.landlordId, action: 'ban' })).status).toBe(400);
    expect((await review(null)).status).toBe(400);
    expect(await theCase()).toMatchObject({ status: 'ready' });
  });
});
