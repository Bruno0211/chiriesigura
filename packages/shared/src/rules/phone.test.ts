import { describe, expect, it } from 'vitest';
import { normalizeRoPhone } from './phone';

describe('normalizeRoPhone', () => {
  it.each(['0722 123 456', '+40 722-123-456', '0040722123456', '(0722)123456', '+40722123456', '+40 (0)722 123 456', '0040 0722 123 456'])(
    'normalises %s to E.164',
    (raw) => expect(normalizeRoPhone(raw)).toBe('+40722123456'),
  );
  it('rejects too-short input', () => {
    expect(normalizeRoPhone('123')).toBeNull();
  });
  it('passes non-Romanian E.164 through', () => {
    expect(normalizeRoPhone('+33612345678')).toBe('+33612345678');
  });
});
