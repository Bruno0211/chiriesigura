import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { describe, expect, it, vi } from 'vitest';
import { config } from './proxy';

vi.mock('./lib/auth0', () => ({ auth0: {} }));

const runs = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe('proxy matcher', () => {
  it('runs Auth0 on the student routes', () => {
    for (const url of ['/auth/login', '/auth/callback', '/auth/logout', '/check', '/api/check']) expect(runs(url), url).toBe(true);
  });
  // Landlord and viewing flows must keep working even if Auth0 is unconfigured or down.
  it('never runs on landlord, viewing or public pages', () => {
    for (const url of ['/', '/verify', '/viewing/abc', '/privacy', '/api/nv/start', '/api/verify/identity', '/api/viewing/report', '/demo/listing/d1']) {
      expect(runs(url), url).toBe(false);
    }
  });
});
