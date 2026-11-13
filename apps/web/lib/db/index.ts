import { PGlite } from '@electric-sql/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Db | undefined;
// Survives dev hot reloads, so only one PGlite ever opens the data dir.
const g = globalThis as { __localDb?: Db };

export function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (url) {
      instance = drizzle(postgres(url, { prepare: false }), { schema }) as unknown as Db;
    } else if (process.env.NODE_ENV !== 'production') {
      // shortcut: local dev without Postgres uses embedded PGlite in .pglite (run `pnpm db:migrate` first); set DATABASE_URL for real use.
      g.__localDb ??= drizzlePglite(new PGlite('./.pglite'), { schema }) as unknown as Db;
      instance = g.__localDb;
    } else {
      throw new Error('DATABASE_URL is not set');
    }
  }
  return instance;
}

/** Tests and scripts swap in their own database. */
export function setDb(db: Db): void {
  instance = db;
}

export { schema };
