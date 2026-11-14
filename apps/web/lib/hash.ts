import { createHmac } from 'node:crypto';

/** Peppered hash of an E.164 phone number. Raw numbers are never stored. */
export function phoneHash(e164: string): string {
  const pepper = process.env.PHONE_PEPPER;
  if (!pepper) throw new Error('PHONE_PEPPER is not set');
  return createHmac('sha256', pepper).update(e164).digest('hex');
}

export interface IdentityHashes { idDocHash: string; nameBirthHash: string }

const nameKey = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Fingerprints of KYC-confirmed identity, used only to keep a banned person out. Raw ID data is never stored. */
export function identityHashes(i: { givenName: string; familyName: string; birthdate: string; idDocument: string }): IdentityHashes {
  const pepper = process.env.PHONE_PEPPER;
  if (!pepper) throw new Error('PHONE_PEPPER is not set');
  const hmac = (v: string) => createHmac('sha256', pepper).update(v).digest('hex');
  return {
    idDocHash: hmac(`id:${i.idDocument.toUpperCase().replace(/[^A-Z0-9]/g, '')}`),
    nameBirthHash: hmac(`name:${nameKey(i.givenName)}|${nameKey(i.familyName)}|${i.birthdate.trim()}`),
  };
}
