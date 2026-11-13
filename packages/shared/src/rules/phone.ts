/** Normalises a phone number to E.164. Romanian national format (0 + 9 digits) becomes +40…; anything unrecognised is null. */
export function normalizeRoPhone(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  let e164: string;
  if (trimmed.startsWith('+')) e164 = `+${digits}`;
  else if (digits.startsWith('00')) e164 = `+${digits.slice(2)}`;
  else if (digits.length === 10 && digits.startsWith('0')) e164 = `+40${digits.slice(1)}`;
  else return null;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}
