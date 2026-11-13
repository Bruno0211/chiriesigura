import { describe, expect, it } from 'vitest';
import { REPORT_CATEGORIES, emptyCounts } from './index';

describe('shared types', () => {
  it('lists report categories in spec order', () => {
    expect(REPORT_CATEGORIES).toEqual(['ok', 'no_show', 'mismatch', 'money_upfront', 'wrong_person']);
  });
  it('creates zeroed report counts', () => {
    expect(emptyCounts()).toEqual({ ok: 0, no_show: 0, mismatch: 0, money_upfront: 0, wrong_person: 0 });
  });
});
