import { defineConfig } from 'wxt';

/**
 * WXT_APP_URL (from .env / .env.local or the shell) is the ChirieSigură web app the extension talks to.
 * Build for the demo with: WXT_APP_URL=https://<prod-url> pnpm --filter @cs/extension build
 */
const appUrl = () => new URL(process.env.WXT_APP_URL || 'http://localhost:3000');
// Extension match patterns cannot carry a port, so the app host matches on any port.
const appHost = () => `${appUrl().protocol}//${appUrl().hostname}`;

export default defineConfig({
  // WXT's dev server otherwise takes the first free port from 3000 and can grab IPv6 localhost:3000 next to the web app.
  dev: { server: { port: 3100 } },
  manifest: () => ({
    name: 'ChirieSigură',
    description: "Shows whether a rental listing's landlord was verified by their mobile operator.",
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
    // The demo listings live on the app's host, known only at build time. Set on the entrypoint, not the
    // manifest: `wxt dev` registers content scripts at runtime from these options and never reads the manifest.
    'entrypoints:resolved': (_wxt, entrypoints) => {
      for (const e of entrypoints) {
        if (e.type === 'content-script') e.options.matches = [...(e.options.matches ?? []), `${appHost()}/demo/listing/*`];
      }
    },
  },
});
