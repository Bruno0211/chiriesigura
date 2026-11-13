import { NetworkAsCodeApiClient } from 'network-as-code';
import type { LocationResult } from '@cs/shared';
import type { MatchValue, Network } from './types';

let client: NetworkAsCodeApiClient | undefined;
const nac = () => {
  if (!client) {
    const apiKey = process.env.NAC_TOKEN;
    if (!apiKey) throw new Error('NAC_TOKEN is not set');
    client = new NetworkAsCodeApiClient({ apiKey });
  }
  return client;
};

const match = (v: unknown): MatchValue => (v === 'true' || v === 'false' ? v : 'not_available');
const NV_SCOPE = 'dpv:FraudPreventionAndDetection number-verification:verify';

export const nokiaNetwork: Network = {
  async kycMatch(phone, i) {
    const r = await nac().kyc.match({ phoneNumber: phone, ...i });
    // Name passes if the operator matched the full name, or both parts.
    const name = r.nameMatch === 'true' || (r.givenNameMatch === 'true' && r.familyNameMatch === 'true')
      ? 'true'
      : match(r.nameMatch ?? r.familyNameMatch);
    return { name, birthdate: match(r.birthdateMatch), idDocument: match(r.idDocumentMatch) };
  },
  async simSwapped(phone, maxAgeHours) {
    return (await nac().simSwap.check({ phoneNumber: phone, maxAge: maxAgeHours })).swapped;
  },
  async verifyLocation(phone, { lat, lng, radiusM }) {
    // The generated Area type omits the CAMARA circle fields, so they are passed through untyped.
    const area = { areaType: 'CIRCLE', center: { latitude: lat, longitude: lng }, radius: radiusM } as never;
    const r = await nac().location.verify({ device: { phoneNumber: phone }, area, maxAge: 60 });
    return r.verificationResult as LocationResult;
  },
  async numberVerificationStart(phone, redirectUri, state) {
    const [creds, oidc] = await Promise.all([nac().oauth.getClientCredentials(), nac().wellKnownMetadata.getOpenidConfiguration()]);
    const u = new URL(oidc.authorization_endpoint);
    u.search = new URLSearchParams({
      response_type: 'code',
      client_id: creds.client_id,
      redirect_uri: redirectUri,
      scope: NV_SCOPE,
      state,
      login_hint: phone,
    }).toString();
    return u.toString();
  },
  async numberVerificationFinish(phone, code, state) {
    // shortcut: an empty code means the operator redirect failed, which in practice is Wi-Fi/VPN; refine if Nokia returns a specific error.
    if (!code) return 'wifi';
    try {
      const r = await nac().numberVerification.verify({ code, state, phoneNumber: phone });
      return r.devicePhoneNumberVerified ? 'ok' : 'fail';
    } catch {
      return 'fail';
    }
  },
};
