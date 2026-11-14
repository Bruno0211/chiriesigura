import { afterEach, describe, expect, it } from 'vitest';
import { identityHashes, phoneHash } from './hash';

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

const a = { givenName: 'Ștefan ', familyName: 'Ionescu', birthdate: '1990-07-15', idDocument: 'tm 123456' };

describe('identityHashes', () => {
  it('normalises case, spaces and diacritics', () => {
    expect(identityHashes(a)).toEqual(
      identityHashes({ givenName: 'STEFAN', familyName: ' ionescu', birthdate: '1990-07-15', idDocument: 'TM123456' }),
    );
  });
  it('treats cedilla ş and comma-below ș the same', () => {
    expect(identityHashes({ ...a, givenName: 'Şerban' }).nameBirthHash).toBe(identityHashes({ ...a, givenName: 'Șerban' }).nameBirthHash);
  });
  it('a different card keeps the name hash', () => {
    const b = identityHashes({ ...a, idDocument: 'TM999999' });
    expect(b.nameBirthHash).toBe(identityHashes(a).nameBirthHash);
    expect(b.idDocHash).not.toBe(identityHashes(a).idDocHash);
  });
  it('the two kinds never collide', () => {
    const h = identityHashes({ givenName: 'x', familyName: 'y', birthdate: 'z', idDocument: 'X|Y|Z' });
    expect(h.idDocHash).not.toBe(h.nameBirthHash);
  });
});
