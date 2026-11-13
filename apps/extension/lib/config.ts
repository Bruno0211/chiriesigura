/** The ChirieSigură web app: /api/check, /verify, /viewing and the demo listings. Set WXT_APP_URL at build time. */
export const APP_URL = (import.meta.env.WXT_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
