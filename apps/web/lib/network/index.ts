import { mockNetwork } from './mock';
import { nokiaNetwork } from './nokia';
import type { KycResult, Network } from './types';

export type * from './types';

type Api = 'NUMBER' | 'KYC' | 'SIMSWAP' | 'LOCATION';
const pick = (api: Api): Network =>
  (process.env[`NETWORK_MODE_${api}`] || process.env.NETWORK_MODE || 'mock') === 'nokia' ? nokiaNetwork : mockNetwork;

/** Resolves the provider per call, so each API can be switched independently via env. */
export function network(): Network {
  return {
    kycMatch: (...a) => pick('KYC').kycMatch(...a),
    simSwapped: (...a) => pick('SIMSWAP').simSwapped(...a),
    verifyLocation: (...a) => pick('LOCATION').verifyLocation(...a),
    numberVerificationStart: (...a) => pick('NUMBER').numberVerificationStart(...a),
    numberVerificationFinish: (...a) => pick('NUMBER').numberVerificationFinish(...a),
  };
}

/** Shown when an operator API call fails (timeout, rate limit, unsupported number). */
export const CHECK_ERROR = "We couldn't run this check. Please try again.";

export const kycPasses = (r: KycResult): boolean => r.name === 'true' && r.birthdate === 'true' && r.idDocument === 'true';
