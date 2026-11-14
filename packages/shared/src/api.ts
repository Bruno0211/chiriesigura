import type { BadgeStatus, ListingRef, ReportCategory, ReportCounts } from './types';

// GET /api/check?site=&listingId=&code=&phone=   (all optional strings)
export interface CheckResponse {
  status: BadgeStatus;
  label: string;                 // verbatim badge copy
  verificationId?: string;       // present for green/amber (for the viewing QR)
  verifiedAt?: string;           // ISO
  locationResult?: 'TRUE' | 'PARTIAL';
  reports?: ReportCounts;        // present for green/amber when any report exists
}

// POST /api/verify/identity
export interface IdentityRequest {
  consent: true;
  givenName: string;
  familyName: string;
  birthdate: string; // YYYY-MM-DD
  idDocument: string;
  address: string;
}
export type CheckStepName = 'number' | 'kyc' | 'simswap' | 'location';
export interface CheckStep { name: CheckStepName; ok: boolean; message: string }
export interface IdentityResponse { ok: boolean; steps: CheckStep[]; verificationId?: string }

// POST /api/verify/location
export interface LocationRequest { verificationId: string }
export interface LocationResponse { ok: boolean; step: CheckStep }

// POST /api/verify/listings
export interface ListingsRequest { verificationId: string; urls: string[] }
export interface ListingsResponse {
  code?: string;
  pasteLine?: string;
  accepted: ListingRef[];
  rejected: { url: string; reason: 'unparseable' | 'already_registered' | 'far_from_address' }[];
}

// POST /api/viewing/report
export interface ReportRequest { consent: true; verificationId: string; category: ReportCategory }
export interface ReportResponse {
  ok: boolean;
  reason?: 'not_at_address' | 'already_reported' | 'not_number_verified';
  counts?: ReportCounts;
}

// Number Verification:
// GET /api/nv/start?phone=<raw>&next=<path>  → 302
// GET /api/nv/callback → 302 to next with ?nv=ok|fail|wifi
export type NvResult = 'ok' | 'fail' | 'wifi';
