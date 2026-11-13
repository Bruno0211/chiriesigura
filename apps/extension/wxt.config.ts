import { defineConfig } from 'wxt';

/**
 * WXT_APP_URL (from .env / .env.local or the shell) is the ChirieSigură web app the extension talks to.
 * Build for the demo with: WXT_APP_URL=https://<prod-url> pnpm --filter @cs/extension build
 */
const appUrl = () => new URL(process.env.WXT_APP_URL || 'http://localhost:3000');
// Extension match patterns cannot carry a port, so the app host matches on any port.
const appHost = () => `${appUrl().protocol}//${appUrl().hostname}`;

export default defineConfig({
  manifest: () => ({
    name: 'ChirieSigură',
    description: "Shows whether a rental listing's landlord was verified by their mobile operator.",
    permissions: ['storage'],
    host_permissions: [`${appHost()}/*`],
    action: { default_title: 'ChirieSigură · listing check' },
    web_accessible_resources: [
      {
        resources: ['fonts/*.woff2'],
        matches: ['*://*.olx.ro/*', '*://*.storia.ro/*', `${appHost()}/*`],
      },
    ],
  }),
  hooks: {
    // The demo listings live on the app's host, known only at build time.
    'build:manifestGenerated': (_wxt, manifest) => {
      for (const script of manifest.content_scripts ?? []) {
        script.matches = [...(script.matches ?? []), `${appHost()}/demo/listing/*`];
      }
    },
  },
});
