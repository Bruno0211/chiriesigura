import { beforeEach, describe, expect, it } from 'vitest';
import type { Db } from '@/lib/db';
import { makeTestDb } from '@/lib/db/test-db';
import {
  DESCRIPTION_MAX_CHARS,
  DESCRIPTION_MAX_LINES,
  EDITABLE_DEMO_LISTINGS,
  normaliseDescription,
  savedDescription,
  saveDescription,
} from './demo-edits';

const lines = (n: number) => Array.from({ length: n }, (_, i) => `Rândul ${i + 1}`);

describe('normaliseDescription', () => {
  it('only d4 is editable, capped at 2000 characters and 20 lines', () => {
    expect(EDITABLE_DEMO_LISTINGS).toEqual(['d4']);
    expect(DESCRIPTION_MAX_CHARS).toBe(2000);
    expect(DESCRIPTION_MAX_LINES).toBe(20);
  });

  it('strips carriage returns, trims each line and drops empty ones', () => {
    expect(normaliseDescription('  a \r\n\r\n b  ')).toEqual(['a', 'b']);
  });

  it('is null when nothing is left', () => {
    expect(normaliseDescription('')).toBeNull();
    expect(normaliseDescription(' \n ')).toBeNull();
  });

  it('is null over 2000 characters', () => {
    expect(normaliseDescription('a'.repeat(2001))).toBeNull();
    expect(normaliseDescription('a'.repeat(2000))).toEqual(['a'.repeat(2000)]);
  });

  it('takes 20 non-empty lines but not 21', () => {
    expect(normaliseDescription(lines(20).join('\n\n'))).toEqual(lines(20));
    expect(normaliseDescription(lines(21).join('\n'))).toBeNull();
  });
});

describe('saved descriptions', () => {
  let db: Db;
  beforeEach(async () => {
    db = await makeTestDb();
  });

  it('is null for a listing nobody edited', async () => {
    expect(await savedDescription(db, 'd4')).toBeNull();
  });

  it('round-trips, and a second save overwrites the first', async () => {
    await saveDescription(db, 'd4', ['Line one', 'Proprietar verificat · ChirieSigură VC-7K3Q']);
    expect(await savedDescription(db, 'd4')).toEqual(['Line one', 'Proprietar verificat · ChirieSigură VC-7K3Q']);
    await saveDescription(db, 'd4', ['Only this']);
    expect(await savedDescription(db, 'd4')).toEqual(['Only this']);
  });
});
