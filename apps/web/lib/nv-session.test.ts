import { afterEach, describe, expect, it, vi } from 'vitest';
import { issueNvCookie, readNv } from './nv-session';

const req = (setCookie: string) => new Request('http://x/', { headers: { cookie: setCookie.split(';')[0]! } });

afterEach(() => vi.useRealTimers());

describe('nv session cookie', () => {
  it('round-trips the verified phone', () => {
    expect(readNv(req(issueNvCookie('+40700000001')))).toEqual({ e164: '+40700000001' });
  });
  it('rejects a tampered cookie', () => {
    const c = issueNvCookie('+40700000001').split(';')[0]!;
    const [name, value] = c.split('=');
    const tampered = `${name}=${value!.replace(/^./, (ch) => (ch === 'A' ? 'B' : 'A'))}`;
    expect(readNv(new Request('http://x/', { headers: { cookie: tampered } }))).toBeNull();
  });
  it('expires after 15 minutes', () => {
    vi.useFakeTimers();
    const c = issueNvCookie('+40700000001');
    vi.advanceTimersByTime(16 * 60 * 1000);
    expect(readNv(req(c))).toBeNull();
  });
  it('is null without a cookie', () => {
    expect(readNv(new Request('http://x/'))).toBeNull();
  });
});
