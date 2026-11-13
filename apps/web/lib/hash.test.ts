import { afterEach, describe, expect, it } from 'vitest';
import { phoneHash } from './hash';

const original = process.env.PHONE_PEPPER;
afterEach(() => { process.env.PHONE_PEPPER = original; });

describe('phoneHash', () => {
  it('is stable for the same input', () => {
    expect(phoneHash('+40700000001')).toBe(phoneHash('+40700000001'));
  });
  it('changes with the pepper', () => {
    const a = phoneHash('+40700000001');
    process.env.PHONE_PEPPER = 'other';
    expect(phoneHash('+40700000001')).not.toBe(a);
  });
  it('is 64 hex chars', () => {
    expect(phoneHash('+40700000001')).toMatch(/^[0-9a-f]{64}$/);
  });
  it('throws without a pepper', () => {
    delete process.env.PHONE_PEPPER;
    expect(() => phoneHash('+40700000001')).toThrow();
  });
});
