import type { LocationResult, NvResult } from '@cs/shared';
import type { KycResult } from './types';

/** Demo phone numbers (kept in sync with the seed and docs/pitch.md). Any other number passes everything. */
export interface Fixture { kyc?: Partial<KycResult>; simSwapped?: boolean; location?: LocationResult; nv?: NvResult }

export const MOCK_FIXTURES: Record<string, Fixture> = {
  '+40700000001': {}, // landlord: all pass
  '+40700000002': { simSwapped: true },
  '+40700000003': { kyc: { idDocument: 'false' } },
  '+40700000004': { location: 'FALSE' },
  '+40700000005': { location: 'PARTIAL' },
  '+40700000006': { nv: 'wifi' },
  // +40700000009 (Mihai, the seeded scammer) and +40700000010 (his new SIM in the demo) pass everything.
};
