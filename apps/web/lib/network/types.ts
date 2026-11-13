import type { LocationResult, NvResult } from '@cs/shared';

export type MatchValue = 'true' | 'false' | 'not_available';
export interface KycInput { givenName: string; familyName: string; birthdate: string; idDocument: string }
export interface KycResult { name: MatchValue; birthdate: MatchValue; idDocument: MatchValue }
export interface Area { lat: number; lng: number; radiusM: number }

export interface Network {
  kycMatch(phone: string, input: KycInput): Promise<KycResult>;
  simSwapped(phone: string, maxAgeHours: number): Promise<boolean>;
  verifyLocation(phone: string, area: Area): Promise<LocationResult>;
  /** URL to send the phone's browser to. */
  numberVerificationStart(phone: string, redirectUri: string, state: string): Promise<string>;
  numberVerificationFinish(phone: string, code: string, state: string): Promise<NvResult>;
}
