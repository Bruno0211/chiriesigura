export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_RE = /\bVC-[A-HJ-NP-Z2-9]{4}\b/i;

// shortcut: Math.random is fine for a 4-char display code; uniqueness is enforced by the DB, not by randomness.
export function generateCode(rand: () => number = Math.random): string {
  let s = 'VC-';
  for (let i = 0; i < 4; i++) s += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return s;
}

export function findCode(text: string): string | null {
  return text.match(CODE_RE)?.[0].toUpperCase() ?? null;
}

export const pasteLine = (code: string): string => `Proprietar verificat · ChirieSigură ${code}`;
