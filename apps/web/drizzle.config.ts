import { defineConfig } from 'drizzle-kit';

const base = { dialect: 'postgresql', schema: './lib/db/schema.ts', out: './drizzle' } as const;

// Without DATABASE_URL, migrate the local PGlite database the dev server uses.
export default process.env.DATABASE_URL
  ? defineConfig({ ...base, dbCredentials: { url: process.env.DATABASE_URL } })
  : defineConfig({ ...base, driver: 'pglite', dbCredentials: { url: './.pglite' } });
