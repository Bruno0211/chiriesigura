import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SIM_SWAP_WINDOW_HOURS, simSwapFailMessage, simSwapSpan, simSwapWindowHours } from './sim-swap-window';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('simSwapWindowHours', () => {
  it('defaults to 7 days', () => {
    expect(DEFAULT_SIM_SWAP_WINDOW_HOURS).toBe(168);
    expect(simSwapWindowHours()).toBe(168);
  });
  it('reads NEXT_PUBLIC_SIM_SWAP_WINDOW_HOURS', () => {
    vi.stubEnv('NEXT_PUBLIC_SIM_SWAP_WINDOW_HOURS', '1');
    expect(simSwapWindowHours()).toBe(1);
  });
  it("falls back to 7 days on values Nokia would refuse", () => {
    for (const raw of ['', '0', '-1', '2401', '1.5', 'abc']) expect(simSwapWindowHours(raw)).toBe(168);
  });
  it("accepts Nokia's full range", () => {
    expect(simSwapWindowHours('2400')).toBe(2400);
  });
});

describe('SIM-swap copy', () => {
  it('keeps the pinned 7-day message', () => {
    expect(simSwapFailMessage(168)).toBe('This SIM was changed in the last 7 days');
  });
  it('names one hour plainly', () => {
    expect(simSwapFailMessage(1)).toBe('This SIM was changed in the last hour');
    expect(simSwapSpan(1)).toBe('1 hour');
  });
  it('formats days and hours', () => {
    expect(simSwapSpan(24)).toBe('1 day');
    expect(simSwapSpan(48)).toBe('2 days');
    expect(simSwapSpan(36)).toBe('36 hours');
  });
});
