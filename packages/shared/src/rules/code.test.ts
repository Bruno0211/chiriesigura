import { describe, expect, it } from 'vitest';
import { CODE_ALPHABET, findCode, generateCode, pasteLine } from './code';

describe('codes', () => {
  it('uses an alphabet without 0, O, 1, I', () => {
    expect(CODE_ALPHABET).toBe('ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
  });
  it('generates deterministic codes from the random source', () => {
    expect(generateCode(() => 0)).toBe('VC-AAAA');
  });
  it('always generates well-formed codes', () => {
    for (let i = 0; i < 1000; i++) expect(generateCode()).toMatch(/^VC-[A-HJ-NP-Z2-9]{4}$/);
  });
  it('finds a lowercase code and returns it uppercased', () => {
    expect(findCode('Proprietar verificat · ChirieSigură vc-7k3q')).toBe('VC-7K3Q');
  });
  it('ignores codes with ambiguous characters and text without codes', () => {
    expect(findCode('VC-0O1I')).toBeNull();
    expect(findCode('no code')).toBeNull();
  });
  it('builds the paste line verbatim', () => {
    expect(pasteLine('VC-7K3Q')).toBe('Proprietar verificat · ChirieSigură VC-7K3Q');
  });
});
