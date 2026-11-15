import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/lib/db';
import { demoListingEdit } from '@/lib/db/schema';
import { makeTestDb } from '@/lib/db/test-db';
import { savedDescription } from '@/lib/demo-edits';
import { PUT } from './[id]/description/route';

const LINE = 'Proprietar verificat · ChirieSigură VC-7K3Q';

let db: Db;

beforeEach(async () => {
  db = await makeTestDb();
});

/** Sends the raw request body as given; pass an object to send it as JSON. */
async function put(id: string, body: unknown) {
  const res = await PUT(
    new Request(`http://localhost:3000/api/demo/listings/${id}/description`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
  return { status: res.status, body: (await res.json()) as unknown };
}

describe('PUT /api/demo/listings/[id]/description', () => {
  it('is 404 for a listing the portal does not have', async () => {
    for (const id of ['d99', 'constructor']) {
      expect(await put(id, { description: 'x' })).toEqual({ status: 404, body: { error: 'not_found' } });
    }
  });

  it('refuses a listing that is not editable and stores nothing', async () => {
    expect(await put('d1', { description: LINE })).toEqual({ status: 403, body: { error: 'not_editable' } });
    expect(await savedDescription(db, 'd1')).toBeNull();
    expect(await db.select().from(demoListingEdit)).toEqual([]);
  });

  it('is 400 for a body without a description string, an empty one, or one over the limits', async () => {
    for (const body of ['not json', { description: 42 }, {}, { description: '' }, { description: ' \r\n ' }, { description: 'a'.repeat(2001) }]) {
      expect(await put('d4', body)).toEqual({ status: 400, body: { error: 'bad_request' } });
    }
    expect(await db.select().from(demoListingEdit)).toEqual([]);
  });

  it('saves a pasted line with Windows line endings as clean lines', async () => {
    expect(await put('d4', { description: `Line one\r\n${LINE}` })).toEqual({ status: 200, body: { description: ['Line one', LINE] } });
    expect(await savedDescription(db, 'd4')).toEqual(['Line one', LINE]);
  });

  it('stores markup as plain text, verbatim', async () => {
    expect(await put('d4', { description: '<script>alert(1)</script>' })).toEqual({ status: 200, body: { description: ['<script>alert(1)</script>'] } });
    expect(await savedDescription(db, 'd4')).toEqual(['<script>alert(1)</script>']);
  });
});
