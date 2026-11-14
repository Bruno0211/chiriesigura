/** Default SIM-swap window: a SIM changed in the last 7 days fails the landlord check. */
export const DEFAULT_SIM_SWAP_WINDOW_HOURS = 168;

/**
 * The SIM-swap window in hours, from NEXT_PUBLIC_SIM_SWAP_WINDOW_HOURS (Nokia accepts 1–2400); anything else is 7 days.
 * Production against Nokia's simulator sets 1, because no test number passes Number Verification with a clean
 * 7-day SIM history (docs/checkpoints.md). NEXT_PUBLIC_ so the consent screen names the same window the server checks.
 */
export function simSwapWindowHours(raw: string | undefined = process.env.NEXT_PUBLIC_SIM_SWAP_WINDOW_HOURS): number {
  const h = Number(raw);
  return Number.isInteger(h) && h >= 1 && h <= 2400 ? h : DEFAULT_SIM_SWAP_WINDOW_HOURS;
}

/** '7 days', '1 day', '1 hour', '36 hours'. */
export function simSwapSpan(hours: number = simSwapWindowHours()): string {
  if (hours % 24 === 0) return hours === 24 ? '1 day' : `${hours / 24} days`;
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

/** The failed-check message. The 7-day default is the pinned string "This SIM was changed in the last 7 days". */
export function simSwapFailMessage(hours: number = simSwapWindowHours()): string {
  return `This SIM was changed in the last ${hours === 1 ? 'hour' : simSwapSpan(hours)}`;
}
