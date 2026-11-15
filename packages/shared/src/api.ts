import type { BadgeStatus, ListingRef, ReportCategory, ReportCounts } from './types';

// GET /api/check?site=&listingId=&code=&phone=   (all optional strings)
export interface CheckResponse {
  status: BadgeStatus;
  label: string;                 // verbatim badge copy
  verificationId?: string;       // present for green/amber (for the viewing QR)
  verifiedAt?: string;           // ISO
  city?: string;                 // the city the landlord verified in, for green/amber when known
  locationResult?: 'TRUE' | 'PARTIAL';
  underReview?: true;            // present for green/amber while a viewer's report awaits a team decision
  reports?: ReportCounts;        // present for green/amber only when a published count (all good, or an upheld problem) is above 0
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
  reason?: 'not_at_address' | 'already_reported' | 'not_number_verified' | 'signed_out' | 'barred' | 'own_listing';
  counts?: ReportCounts;
}

// POST /api/review (team only) → { ok: true } | 404 | 409 { error: 'not_ready' | 'already_decided' }
export type ReviewAction = 'dismiss' | 'false_report' | 'uphold' | 'ban';
export interface ReviewRequest { caseId: string; action: ReviewAction }

// Number Verification:
// GET /api/nv/start?phone=<raw>&next=<path>  → 302
// GET /api/nv/callback → 302 to next with ?nv=ok|fail|wifi
export type NvResult = 'ok' | 'fail' | 'wifi';
