import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Runs before `next build`. Only production deploys migrate: previews have no database, and local builds must not touch one.
// Migrations apply before the new code goes live, so they must stay additive (old code keeps working on the new schema).
async function main() {
  if (process.env.VERCEL_ENV !== 'production') return console.log('migrate: skipped (not a production deploy)');
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error('migrate: DATABASE_URL is not set for production');
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
  await sql.end();
  console.log('migrate: production database is up to date');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
