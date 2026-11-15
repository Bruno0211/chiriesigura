import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  test: {
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
    env: { PHONE_PEPPER: 'test-pepper', NETWORK_MODE: 'mock', NEXT_PUBLIC_APP_URL: 'http://localhost:3000', LOCATION_RADIUS_M: '100' },
  },
});
