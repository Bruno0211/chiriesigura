import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Db | undefined;

export function getDb(): Db {
  if (!instance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    instance = drizzle(postgres(url, { prepare: false }), { schema }) as unknown as Db;
  }
  return instance;
}

/** Tests and scripts swap in their own database. */
export function setDb(db: Db): void {
  instance = db;
}

export { schema };
