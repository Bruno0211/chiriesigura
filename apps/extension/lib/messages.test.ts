import { describe, expect, it } from 'vitest';
import { isCheckResponse } from './messages';

describe('isCheckResponse', () => {
  it('accepts a far-away answer', () => {
    expect(isCheckResponse({ status: 'red_far_away', label: 'Listing is far from where the landlord verified' })).toBe(true);
  });
  it('accepts a banned-landlord answer', () => {
    expect(isCheckResponse({ status: 'red_banned', label: 'Landlord banned' })).toBe(true);
  });
  it('accepts an /api/check answer', () => {
    expect(isCheckResponse({ status: 'green', label: 'Verified landlord · near the address', verificationId: 'v1' })).toBe(true);
  });

  it.each([
    ['an HTML error page parsed as nothing', null],
    ['a JSON error body', { error: 'Internal Server Error' }],
    ['an unknown status', { status: 'blue', label: 'Verified' }],
    ['the retired amber status (a cached or older-server answer)', { status: 'amber', label: 'x' }],
    ['a status without a label', { status: 'green' }],
  ])('rejects %s', (_, body) => {
    expect(isCheckResponse(body)).toBe(false);
  });
});
