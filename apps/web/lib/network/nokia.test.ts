import { beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  options: [] as unknown[],
  client: {
    oauth: { getClientCredentials: vi.fn() },
    wellKnownMetadata: { getOpenidConfiguration: vi.fn() },
    numberVerification: { verifyV2: vi.fn() },
    location: { verify: vi.fn() },
  },
}));

vi.mock('network-as-code', () => ({
  NetworkAsCodeApiClient: vi.fn(function (opts: unknown) {
    sdk.options.push(opts);
    return sdk.client;
  }),
}));

import { nokiaNetwork } from './nokia';

const CB = 'http://localhost:3000/api/nv/callback';
const PHONE = '+99999992000';

function stubTokenEndpoint(res: { ok: boolean; status?: number; json: unknown }) {
  const fetchMock = vi.fn(async () => ({ ok: res.ok, status: res.status ?? 200, json: async () => res.json }) as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  process.env.NAC_TOKEN = 'test-key';
  sdk.client.oauth.getClientCredentials.mockResolvedValue({ client_id: 'cid', client_secret: 'secret' });
  sdk.client.wellKnownMetadata.getOpenidConfiguration.mockResolvedValue({
    authorization_endpoint: 'https://auth.example/oauth2/v1/authorize',
    token_endpoint: 'https://auth.example/oauth2/v1/token',
  });
  sdk.client.numberVerification.verifyV2.mockReset();
  sdk.client.location.verify.mockReset();
  vi.unstubAllGlobals();
});

describe('nokia network client', () => {
  it('sends the RapidAPI host header the Network as Code gateway routes on', async () => {
    await nokiaNetwork.numberVerificationStart(PHONE, CB, 'st');
    expect(sdk.options[0]).toMatchObject({ apiKey: 'test-key', rapidapiHost: 'network-as-code.nokia.rapidapi.com' });
  });
});

describe('number verification', () => {
  it('start sends the browser to the operator authorize endpoint for this phone', async () => {
    const u = new URL(await nokiaNetwork.numberVerificationStart(PHONE, CB, 'st'));
    expect(`${u.origin}${u.pathname}`).toBe('https://auth.example/oauth2/v1/authorize');
    expect(Object.fromEntries(u.searchParams)).toMatchObject({
      response_type: 'code',
      client_id: 'cid',
      redirect_uri: CB,
      state: 'st',
      login_hint: PHONE,
    });
    expect(u.searchParams.get('scope')).toContain('number-verification:verify');
  });

  it('finish without a code means the redirect never reached the operator', async () => {
    const fetchMock = stubTokenEndpoint({ ok: true, json: {} });
    expect(await nokiaNetwork.numberVerificationFinish(PHONE, '', 'st', CB)).toBe('wifi');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('finish exchanges the code with the same redirect URI and verifies with v2', async () => {
    const fetchMock = stubTokenEndpoint({ ok: true, json: { access_token: 'tok' } });
    sdk.client.numberVerification.verifyV2.mockResolvedValue({ devicePhoneNumberVerified: true });

    expect(await nokiaNetwork.numberVerificationFinish(PHONE, 'abc', 'st', CB)).toBe('ok');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://auth.example/oauth2/v1/token');
    expect(init.method).toBe('POST');
    expect(Object.fromEntries(new URLSearchParams(init.body as URLSearchParams))).toEqual({
      grant_type: 'authorization_code',
      code: 'abc',
      redirect_uri: CB,
      client_id: 'cid',
      client_secret: 'secret',
    });
    expect(sdk.client.numberVerification.verifyV2).toHaveBeenCalledWith(
      { body: { phoneNumber: PHONE } },
      { headers: { Authorization: 'Bearer tok' } },
    );
  });

  it('finish fails when the operator says the phone uses another number', async () => {
    stubTokenEndpoint({ ok: true, json: { access_token: 'tok' } });
    sdk.client.numberVerification.verifyV2.mockResolvedValue({ devicePhoneNumberVerified: false });
    expect(await nokiaNetwork.numberVerificationFinish(PHONE, 'abc', 'st', CB)).toBe('fail');
  });

  it('finish fails without calling verify when the token exchange is refused', async () => {
    stubTokenEndpoint({ ok: false, status: 400, json: { error: 'invalid_grant' } });
    expect(await nokiaNetwork.numberVerificationFinish(PHONE, 'abc', 'st', CB)).toBe('fail');
    expect(sdk.client.numberVerification.verifyV2).not.toHaveBeenCalled();
  });
});

describe('location verification', () => {
  const AREA = { lat: 45.7537, lng: 21.2257, radiusM: 2000 };

  it('asks the network whether the SIM is inside the circle around the address', async () => {
    sdk.client.location.verify.mockResolvedValue({ verificationResult: 'TRUE', lastLocationTime: '2026-11-14T12:21:28Z' });
    expect(await nokiaNetwork.verifyLocation('+99999991001', AREA)).toBe('TRUE');
    expect(sdk.client.location.verify).toHaveBeenCalledWith({
      device: { phoneNumber: '+99999991001' },
      area: { areaType: 'CIRCLE', center: { latitude: 45.7537, longitude: 21.2257 }, radius: 2000 },
      maxAge: 60,
    });
  });

  it('passes an operator error through, for the routes to turn into a plain-words step', async () => {
    const notFound = Object.assign(new Error('Device identifier not found.'), { statusCode: 404 });
    sdk.client.location.verify.mockRejectedValue(notFound);
    await expect(nokiaNetwork.verifyLocation('+40700000001', AREA)).rejects.toBe(notFound);
  });
});
