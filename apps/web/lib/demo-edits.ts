import { eq } from 'drizzle-orm';
import type { Db } from '@/lib/db';
import { demoListingEdit } from '@/lib/db/schema';

/**
 * The /demo listings a landlord may edit from the phone: only the one registered live on stage.
 * The pitch's fixed listings (d1, d2, d5, d7) stay as they are, so nobody can change them during judging.
 */
export const EDITABLE_DEMO_LISTINGS: readonly string[] = ['d4'];

export const DESCRIPTION_MAX_CHARS = 2000;
export const DESCRIPTION_MAX_LINES = 20;

/**
 * One paragraph per non-empty line, each trimmed, with Windows `\r` removed, so a pasted code line reads exactly.
 * Null when nothing is left, or when the lines run past 2000 characters (counted as stored) or 20 lines.
 */
export function normaliseDescription(text: string): string[] | null {
  const lines = text
    .split('\n')
    .map((line) => line.replaceAll('\r', '').trim())
    .filter(Boolean);
  if (lines.length === 0 || lines.length > DESCRIPTION_MAX_LINES) return null;
  return lines.join('\n').length > DESCRIPTION_MAX_CHARS ? null : lines;
}

/** The landlord's saved description for a demo listing, or null when it shows its built-in text. */
export async function savedDescription(db: Db, listingId: string): Promise<string[] | null> {
  const [row] = await db
    .select({ description: demoListingEdit.description })
    .from(demoListingEdit)
    .where(eq(demoListingEdit.listingId, listingId));
  return row ? row.description.split('\n') : null;
}

export async function saveDescription(db: Db, listingId: string, lines: string[]): Promise<void> {
  const description = lines.join('\n');
  await db
    .insert(demoListingEdit)
    .values({ listingId, description })
    .onConflictDoUpdate({ target: demoListingEdit.listingId, set: { description, updatedAt: new Date() } });
}
