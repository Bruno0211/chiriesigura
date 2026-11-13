import { MOCK_FIXTURES } from './mock-fixtures';
import type { Network } from './types';

const f = (phone: string) => MOCK_FIXTURES[phone] ?? {};

export const mockNetwork: Network = {
  async kycMatch(phone) {
    return { name: 'true', birthdate: 'true', idDocument: 'true', ...f(phone).kyc };
  },
  async simSwapped(phone) {
    return f(phone).simSwapped ?? false;
  },
  async verifyLocation(phone) {
    return f(phone).location ?? 'TRUE';
  },
  async numberVerificationStart(_phone, redirectUri, state) {
    return `${redirectUri}?code=mock&state=${encodeURIComponent(state)}`;
  },
  async numberVerificationFinish(phone) {
    return f(phone).nv ?? 'ok';
  },
};
