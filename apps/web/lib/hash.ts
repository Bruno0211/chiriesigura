import { createHmac } from 'node:crypto';

/** Peppered hash of an E.164 phone number. Raw numbers are never stored. */
export function phoneHash(e164: string): string {
  const pepper = process.env.PHONE_PEPPER;
  if (!pepper) throw new Error('PHONE_PEPPER is not set');
  return createHmac('sha256', pepper).update(e164).digest('hex');
}
