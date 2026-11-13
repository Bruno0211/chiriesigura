import { NetworkAsCodeApiClient } from 'network-as-code';
import type { LocationResult } from '@cs/shared';
import type { MatchValue, Network } from './types';

/** The NaC RapidAPI gateway routes on this host header; without it every call is 404 "API doesn't exists". */
const RAPIDAPI_HOST = 'network-as-code.nokia.rapidapi.com';

let client: NetworkAsCodeApiClient | undefined;
const nac = () => {
  if (!client) {
    const apiKey = process.env.NAC_TOKEN;
    if (!apiKey) throw new Error('NAC_TOKEN is not set');
    client = new NetworkAsCodeApiClient({ apiKey, rapidapiHost: RAPIDAPI_HOST });
  }
  return client;
};

/** The app's OAuth client and the operator's authorization server; fetched once per server instance. */
interface OAuthConfig { clientId: string; clientSecret: string; authorizeEndpoint: string; tokenEndpoint: string }
let oauth: Promise<OAuthConfig> | undefined;
const oauthConfig = () =>
  (oauth ??= Promise.all([nac().oauth.getClientCredentials(), nac().wellKnownMetadata.getOpenidConfiguration()])
    .then(([c, o]) => ({
      clientId: c.client_id,
      clientSecret: c.client_secret,
      authorizeEndpoint: o.authorization_endpoint,
      tokenEndpoint: o.token_endpoint,
    }))
    .catch((e) => {
      oauth = undefined; // retry on the next request instead of caching the failure
      throw e;
    }));

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
    const { clientId, authorizeEndpoint } = await oauthConfig();
    const u = new URL(authorizeEndpoint);
    u.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: NV_SCOPE,
      state,
      login_hint: phone,
    }).toString();
    return u.toString();
  },
  async numberVerificationFinish(phone, code, _state, redirectUri) {
    // shortcut: an empty code means the operator redirect failed, which in practice is Wi-Fi/VPN; refine if Nokia returns a specific error.
    if (!code) return 'wifi';
    try {
      // The operator's code buys a single-use access token for this phone; the v2 verify call carries it.
      const { clientId, clientSecret, tokenEndpoint } = await oauthConfig();
      const res = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      const token = (await res.json().catch(() => null)) as { access_token?: string } | null;
      if (!res.ok || !token?.access_token) return 'fail';
      const r = await nac().numberVerification.verifyV2(
        { body: { phoneNumber: phone } },
        { headers: { Authorization: `Bearer ${token.access_token}` } },
      );
      return r.devicePhoneNumberVerified ? 'ok' : 'fail';
    } catch {
      return 'fail';
    }
  },
};
