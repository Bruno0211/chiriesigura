import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import { setDb, type Db } from './index';
import * as schema from './schema';

const migrationsFolder = fileURLToPath(new URL('../../drizzle', import.meta.url));

/** Fresh in-memory Postgres with all migrations applied; also installed as the app's db. */
export async function makeTestDb(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder });
  setDb(db as unknown as Db);
  return db as unknown as Db;
}
