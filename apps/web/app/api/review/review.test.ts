import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import type { CheckResponse } from '@cs/shared';
import { auth0 } from '@/lib/auth0';
import { makeTestDb } from '@/lib/db/test-db';
import { landlord } from '@/lib/db/schema';
import { holdList } from '@/lib/queries';
import { addReports, seedVerified } from '@/lib/test-seed';
import type { Db } from '@/lib/db';
import { GET as check } from '../check/route';
import { POST } from './route';

vi.mock('@/lib/auth0', () => ({ auth0: { getSession: vi.fn() }, isSignedIn: vi.fn(async () => true) }));

let db: Db;
let seeded: Awaited<ReturnType<typeof seedVerified>>;

const as = (email: string | null, verified = true) =>
  vi.mocked(auth0.getSession).mockResolvedValue(email ? ({ user: { email, email_verified: verified } } as never) : null);
const review = (body: unknown) =>
  POST(new Request('http://localhost:3000/api/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
const bannedAt = async (id: string) => (await db.select().from(landlord).where(eq(landlord.id, id)))[0]!.bannedAt;

beforeEach(async () => {
  vi.stubEnv('REVIEW_EMAILS', 'team@x.ro, Lead@x.ro');
  db = await makeTestDb();
  seeded = await seedVerified(db);
  await addReports(db, seeded.verificationId, 'money_upfront', 2);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.mocked(auth0.getSession).mockReset();
});

describe('holdList', () => {
  it('lists a landlord over the warning thresholds', async () => {
    const items = await holdList(db);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ landlordId: seeded.landlordId, reports: { money_upfront: 2 } });
    expect(items[0]!.listings).toEqual([{ site: 'demo', listingId: 'd1', url: 'http://localhost:3000/demo/listing/d1' }]);
  });
  it('is empty under the thresholds', async () => {
    db = await makeTestDb();
    const s = await seedVerified(db);
    await addReports(db, s.verificationId, 'money_upfront', 1);
    expect(await holdList(db)).toEqual([]);
  });
});

describe('POST /api/review', () => {
  it.each([
    ['no session', null, true],
    ['a student', 'student@x.ro', true],
    ['a team email that is not verified', 'team@x.ro', false],
  ] as const)('refuses %s', async (_, email, verified) => {
    as(email, verified);
    const res = await review({ landlordId: seeded.landlordId, action: 'ban' });
    expect(res.status).toBe(403);
    expect(await bannedAt(seeded.landlordId)).toBeNull();
  });

  it('bans for a reviewer (email compared case-insensitively)', async () => {
    as('lead@x.ro');
    expect((await review({ landlordId: seeded.landlordId, action: 'ban' })).status).toBe(200);
    expect(await holdList(db)).toEqual([]);
    const res = await check(new Request('http://localhost:3000/api/check?site=demo&listingId=d1&code=VC-7K3Q'));
    expect(((await res.json()) as CheckResponse).status).toBe('red_banned');
  });

  it("a ban spreads to the person's other phone numbers", async () => {
    as('team@x.ro');
    await db.update(landlord).set({ nameBirthHash: 'same-person' }).where(eq(landlord.id, seeded.landlordId));
    const [other] = await db.insert(landlord).values({ phoneHash: 'second-sim', nameBirthHash: 'same-person' }).returning();
    const [stranger] = await db.insert(landlord).values({ phoneHash: 'third-sim', nameBirthHash: 'someone-else' }).returning();
    await review({ landlordId: seeded.landlordId, action: 'ban' });
    expect(await bannedAt(other!.id)).not.toBeNull();
    expect(await bannedAt(stranger!.id)).toBeNull();
  });

  it('a second ban keeps the first date', async () => {
    as('team@x.ro');
    await review({ landlordId: seeded.landlordId, action: 'ban' });
    const first = await bannedAt(seeded.landlordId);
    await review({ landlordId: seeded.landlordId, action: 'ban' });
    expect(await bannedAt(seeded.landlordId)).toEqual(first);
  });

  it('404 for an unknown landlord, 400 for a bad body', async () => {
    as('team@x.ro');
    expect((await review({ landlordId: '00000000-0000-4000-8000-000000000000', action: 'ban' })).status).toBe(404);
    expect((await review({ landlordId: 'not-a-uuid', action: 'ban' })).status).toBe(400);
    expect((await review({ landlordId: seeded.landlordId, action: 'delete' })).status).toBe(400);
  });

  it('dismiss takes the landlord off hold until a new report arrives', async () => {
    as('team@x.ro');
    expect((await review({ landlordId: seeded.landlordId, action: 'dismiss' })).status).toBe(200);
    expect(await holdList(db)).toEqual([]);
    await new Promise((r) => setTimeout(r, 5));
    await addReports(db, seeded.verificationId, 'no_show', 1);
    expect(await holdList(db)).toHaveLength(1);
  });
});
